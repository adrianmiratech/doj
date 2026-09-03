import type { NextAuthConfig } from "next-auth";
import { encode as defaultEncode } from "next-auth/jwt";
import type { Role } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      nombre: string;
      apellidos: string;
      role: Role;
      cargo: string | null;
      legajo: string | null;
      esStaffServidor: boolean;
      perfilPendiente: boolean;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    nombre: string;
    apellidos: string;
    cargo: string | null;
    legajo: string | null;
    esStaffServidor: boolean;
    perfilPendiente: boolean;
    remember?: boolean;
  }
}

// Sesion corta por defecto; "mantener sesion iniciada" la extiende a 30 dias.
const SESION_CORTA_SEGUNDOS = 60 * 60 * 8;
const SESION_LARGA_SEGUNDOS = 60 * 60 * 24 * 30;

// El "exp" real de un JWT de Auth.js lo decide el "maxAge" que se le pasa a
// encode() en el momento de firmarlo, no un campo "exp" que pongamos nosotros
// en el callback jwt (encode() lo sobrescribe siempre). Por eso interceptamos
// encode() para variar el maxAge segun si el usuario marco "recordar sesion".
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt", maxAge: SESION_LARGA_SEGUNDOS },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [],
  jwt: {
    encode(params) {
      const recordar = params.token?.remember === true;
      return defaultEncode({
        ...params,
        maxAge: recordar ? SESION_LARGA_SEGUNDOS : SESION_CORTA_SEGUNDOS,
      });
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: Role }).role;
        token.nombre = (user as { nombre: string }).nombre;
        token.apellidos = (user as { apellidos: string }).apellidos;
        token.cargo = (user as { cargo: string | null }).cargo;
        token.legajo = (user as { legajo: string | null }).legajo;
        token.esStaffServidor = (user as { esStaffServidor?: boolean }).esStaffServidor === true;
        token.perfilPendiente = (user as { perfilPendiente?: boolean }).perfilPendiente === true;
        token.remember = (user as { remember?: boolean }).remember === true;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.nombre = token.nombre;
      session.user.apellidos = token.apellidos;
      session.user.cargo = token.cargo;
      session.user.legajo = token.legajo;
      session.user.esStaffServidor = token.esStaffServidor === true;
      session.user.perfilPendiente = token.perfilPendiente === true;
      return session;
    },
  },
};
