import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { enviarLogDiscord, avisarOwnerDiscord } from "@/lib/discord-logs";
import { ROLE_LABELS } from "@/lib/labels";

// Protección anti-fuerza-bruta: intentos fallidos por correo en memoria (el
// proceso de la web es de un único servidor, no hace falta persistirlos).
const INTENTOS_MAX = 5;
const VENTANA_INTENTOS_MS = 15 * 60_000;
const BLOQUEO_MS = 15 * 60_000;
const intentosFallidos = new Map<string, number[]>();

function registrarIntentoFallido(email: string): number {
  const ahora = Date.now();
  const lista = (intentosFallidos.get(email) ?? []).filter((t) => ahora - t < VENTANA_INTENTOS_MS);
  lista.push(ahora);
  intentosFallidos.set(email, lista);
  return lista.length;
}

function ipDe(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "desconocida";
}

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
          select: { role: true, cargo: true, legajo: true, nombre: true, apellidos: true },
        });
        if (fresco) {
          token.role = fresco.role;
          token.cargo = fresco.cargo;
          token.legajo = fresco.legajo;
          token.nombre = fresco.nombre;
          token.apellidos = fresco.apellidos;
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
        remember: { label: "Recordarme", type: "text" },
      },
      authorize: async (credentials, request) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const correo = email.toLowerCase().trim();
        const ip = ipDe(request);

        const user = await prisma.user.findUnique({ where: { email: correo } });
        if (!user || !user.activo) return null;
        if (user.suspendidoHasta && user.suspendidoHasta.getTime() > Date.now()) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          const intentos = registrarIntentoFallido(correo);
          await enviarLogDiscord(
            prisma,
            "accesos",
            `⚠️ Login fallido para **${correo}** desde \`${ip}\` (intento ${intentos}/${INTENTOS_MAX}).`,
          );
          if (intentos >= INTENTOS_MAX) {
            const hasta = new Date(Date.now() + BLOQUEO_MS);
            await prisma.user.update({ where: { id: user.id }, data: { suspendidoHasta: hasta } });
            await avisarOwnerDiscord(
              `Posible ataque de fuerza bruta: **${correo}** (${user.nombre} ${user.apellidos}) tuvo ${intentos} logins fallidos seguidos desde \`${ip}\`. Cuenta bloqueada temporalmente hasta las ${hasta.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}.`,
            );
          }
          return null;
        }

        intentosFallidos.delete(correo);
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
          remember: credentials.remember === "true",
        };
      },
    }),
  ],
});
