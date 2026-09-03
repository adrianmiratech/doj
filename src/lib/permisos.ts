import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Catálogo fijo de permisos delegables. El Juez Supremo siempre los tiene
// todos (no está sujeto a esta tabla); el resto de rangos empiezan sin
// ninguno hasta que el Juez Supremo se los conceda en Permisos.
export const PERMISOS = {
  GESTIONAR_EMPLEADOS: "Gestionar empleados (contratar, rango, cuenta, contraseña, foto)",
  GESTIONAR_POSTULACIONES: "Revisar postulaciones de civiles",
  GESTIONAR_CATALOGOS: "Gestionar catálogos de trámites y pluses",
  GESTIONAR_FALTAS: "Imponer faltas y resolver solicitudes de falta",
  GESTIONAR_EXAMENES: "Gestionar plantillas y exámenes",
  GESTIONAR_NOMINAS: "Gestionar nóminas (pagos, cierre semanal, ajustar horas, tarifas por rango)",
  GESTIONAR_CONDECORACIONES: "Gestionar condecoraciones",
  RESOLVER_ORDENES: "Resolver órdenes judiciales y publicar resoluciones",
} as const;

export type PermisoKey = keyof typeof PERMISOS;

export const PERMISO_KEYS = Object.keys(PERMISOS) as PermisoKey[];

// Varias páginas y acciones consultan el mismo permiso repetidas veces en
// un mismo request (layout + página + acciones); cache() de React dedupe
// esas consultas dentro de un mismo render/request, sin servir datos
// obsoletos entre requests distintos.
export const tienePermiso = cache(async (role: string, permiso: PermisoKey): Promise<boolean> => {
  if (role === "JUEZ_SUPREMO") return true;
  const concedido = await prisma.rolPermiso.findUnique({
    where: { role_permiso: { role: role as never, permiso } },
  });
  return !!concedido;
});

/** Exige el permiso indicado (el Juez Supremo siempre lo cumple). Lanza si no está autenticado o no lo tiene. */
export async function requirePermiso(permiso: PermisoKey) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  if (session.user.role === "JUEZ_SUPREMO") return session.user;
  const ok = await tienePermiso(session.user.role, permiso);
  if (!ok) throw new Error("No autorizado");
  return session.user;
}

export async function requireJuezSupremo() {
  const session = await auth();
  if (!session?.user || session.user.role !== "JUEZ_SUPREMO") throw new Error("No autorizado");
  return session.user;
}
