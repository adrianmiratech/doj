import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { enviarLogDiscord, avisarOwnerDiscord } from "@/lib/discord-logs";
import { ROLE_LABELS } from "@/lib/labels";
import { verificarCodigoTotp } from "@/lib/totp";
import {
  INTENTOS_MAX,
  BLOQUEO_MS,
  registrarIntentoFallido,
  limpiarIntentosFallidos,
  registrarAcceso,
  ipDeRequest,
} from "@/lib/login-security";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt(params) {
      const token = await authConfig.callbacks!.jwt!(params);
      // Refresca rango/cargo/placa desde la BD en cada peticion (no solo al
      // iniciar sesion), para que un cambio de rango se refleje al instante
      // sin tener que cerrar y volver a abrir sesion.
      if (token?.id) {
        const fresco = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, cargo: true, legajo: true, nombre: true, apellidos: true, esStaffServidor: true, perfilPendiente: true },
        });
        if (fresco) {
          token.role = fresco.role;
          token.cargo = fresco.cargo;
          token.legajo = fresco.legajo;
          token.nombre = fresco.nombre;
          token.apellidos = fresco.apellidos;
          token.esStaffServidor = fresco.esStaffServidor;
          token.perfilPendiente = fresco.perfilPendiente;
        }
      }
      return token;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
        totp: { label: "Código de verificación en dos pasos", type: "text" },
        remember: { label: "Recordarme", type: "text" },
      },
      authorize: async (credentials, request) => {
        const email = credentials?.email;
        const password = credentials?.password;
        const totp = credentials?.totp;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const correo = email.toLowerCase().trim();
        const ip = ipDeRequest(request);

        const user = await prisma.user.findUnique({ where: { email: correo } });
        if (!user) {
          registrarAcceso(correo, ip, false, "usuario_no_encontrado");
          return null;
        }
        if (!user.activo) {
          registrarAcceso(correo, ip, false, "cuenta_inhabilitada", user.id);
          return null;
        }
        if (user.suspendidoHasta && user.suspendidoHasta.getTime() > Date.now()) {
          registrarAcceso(correo, ip, false, "cuenta_suspendida", user.id);
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        const codigoValido =
          !user.totpHabilitado || (typeof totp === "string" && (await verificarCodigoTotp(user.totpSecret!, totp)));

        if (!valid || !codigoValido) {
          const motivo = !valid ? "credenciales_invalidas" : "totp_invalido";
          registrarAcceso(correo, ip, false, motivo, user.id);
          const intentos = registrarIntentoFallido(correo);
          await enviarLogDiscord(
            prisma,
            "accesos",
            `⚠️ Login fallido para **${correo}** desde \`${ip}\` (${!valid ? "credenciales" : "código 2FA"} · intento ${intentos}/${INTENTOS_MAX}).`,
          );
          if (intentos >= INTENTOS_MAX) {
            const hasta = new Date(Date.now() + BLOQUEO_MS);
            await prisma.user.update({ where: { id: user.id }, data: { suspendidoHasta: hasta } });
            await avisarOwnerDiscord(
              prisma,
              `Posible ataque de fuerza bruta: **${correo}** (${user.nombre} ${user.apellidos}) tuvo ${intentos} logins fallidos seguidos desde \`${ip}\`. Cuenta bloqueada temporalmente hasta las ${hasta.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}.`,
              { email: correo, ip },
            );
          }
          return null;
        }

        limpiarIntentosFallidos(correo);
        registrarAcceso(correo, ip, true, "ok", user.id);
        await prisma.user.update({ where: { id: user.id }, data: { ultimoAcceso: new Date() } });
        await enviarLogDiscord(
          prisma,
          "accesos",
          `🔓 **${user.nombre} ${user.apellidos}** (${ROLE_LABELS[user.role] ?? user.role}) inició sesión en el portal desde \`${ip}\`.`,
        );

        return {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          apellidos: user.apellidos,
          role: user.role,
          cargo: user.cargo,
          legajo: user.legajo,
          esStaffServidor: user.esStaffServidor,
          perfilPendiente: user.perfilPendiente,
          remember: credentials.remember === "true",
        };
      },
    }),
  ],
});
