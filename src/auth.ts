import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

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
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });
        if (!user || !user.activo) return null;
        if (user.suspendidoHasta && user.suspendidoHasta.getTime() > Date.now()) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        await prisma.user.update({ where: { id: user.id }, data: { ultimoAcceso: new Date() } });

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
