import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import type { PermisoKey } from "@/lib/permisos";

type DatosNotificacion = {
  tipo: string;
  titulo: string;
  mensaje?: string;
  enlace?: string;
};

export async function notificarUsuario(userId: string, datos: DatosNotificacion) {
  await prisma.notificacion.create({ data: { userId, ...datos } });
}

export async function notificarRoles(roles: Role[], datos: DatosNotificacion) {
  const usuarios = await prisma.user.findMany({
    where: { role: { in: roles }, activo: true },
    select: { id: true },
  });
  if (usuarios.length === 0) return;
  await prisma.notificacion.createMany({
    data: usuarios.map((u) => ({ userId: u.id, ...datos })),
  });
}

/** Notifica a quien siempre debería verlo (rolesBase, por defecto Juez Supremo) más quien tenga el permiso delegado. */
export async function notificarConPermiso(
  permiso: PermisoKey,
  datos: DatosNotificacion,
  rolesBase: Role[] = ["JUEZ_SUPREMO"],
) {
  const concedidos = await prisma.rolPermiso.findMany({ where: { permiso } });
  const roles = Array.from(new Set([...rolesBase, ...concedidos.map((c) => c.role)])) as Role[];
  await notificarRoles(roles, datos);
}
