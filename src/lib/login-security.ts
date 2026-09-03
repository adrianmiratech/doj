import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// Protección anti-fuerza-bruta: intentos fallidos por correo en memoria (el
// proceso de la web es de un único servidor, no hace falta persistirlos).
// Compartido entre el precheck del login (src/app/login/actions.ts) y el
// authorize() de NextAuth (src/auth.ts) para que sea un único contador.
export const INTENTOS_MAX = 5;
export const VENTANA_INTENTOS_MS = 15 * 60_000;
export const BLOQUEO_MS = 15 * 60_000;

const intentosFallidos = new Map<string, number[]>();

export function registrarIntentoFallido(email: string): number {
  const ahora = Date.now();
  const lista = (intentosFallidos.get(email) ?? []).filter((t) => ahora - t < VENTANA_INTENTOS_MS);
  lista.push(ahora);
  intentosFallidos.set(email, lista);
  return lista.length;
}

export function limpiarIntentosFallidos(email: string) {
  intentosFallidos.delete(email);
}

export async function ipDeHeaders(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "desconocida";
}

export function ipDeRequest(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "desconocida";
}

export function registrarAcceso(email: string, ip: string, exito: boolean, motivo: string, userId?: string) {
  prisma.accesoLog
    .create({ data: { email, ip, exito, motivo, userId: userId ?? null } })
    .catch((error) => console.error("[accesos] Error guardando AccesoLog:", error));
}
