"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { notificarDiscord } from "@/lib/discord-notify";
import { enviarLogDiscord } from "@/lib/discord-logs";
import { requireJuezSupremo } from "@/lib/permisos";
import { generarPasswordTemporal } from "@/lib/password";

const ROLES_GESTIONABLES_EN_USUARIOS = ["CIVIL", "ENCARGADO_SAPD", "SAPD"] as const;

/** Gestión de cuentas ciudadanas y de SAPD desde una vista única, distinta de la gestión de empleados del DOJ. */
export async function alternarActivoUsuario(formData: FormData) {
  const admin = await requireJuezSupremo();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  const usuario = await prisma.user.findUniqueOrThrow({ where: { id } });
  if (!ROLES_GESTIONABLES_EN_USUARIOS.includes(usuario.role as (typeof ROLES_GESTIONABLES_EN_USUARIOS)[number])) {
    throw new Error("Esta cuenta no es civil ni de SAPD; gestiónala desde Empleados");
  }

  await prisma.user.update({ where: { id }, data: { activo: !usuario.activo } });
  await enviarLogDiscord(
    prisma,
    "empleados",
    `${usuario.activo ? "⛔ Inhabilitada" : "✅ Reactivada"} la cuenta de **${usuario.nombre} ${usuario.apellidos}** por ${admin.nombre} ${admin.apellidos}.`,
  );

  revalidatePath("/dashboard/usuarios");
}

export async function resetearPasswordUsuario(formData: FormData) {
  await requireJuezSupremo();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  const usuario = await prisma.user.findUniqueOrThrow({ where: { id } });
  if (!usuario.discordId) {
    throw new Error("Este ciudadano no tiene Discord vinculado; pídele que lo configure en Mi perfil primero.");
  }

  const nuevaPassword = generarPasswordTemporal();
  await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(nuevaPassword, 10) } });

  await notificarDiscord(
    usuario.discordId,
    `🔐 Tu contraseña del portal ciudadano ha sido restablecida. Nueva contraseña temporal: \`${nuevaPassword}\``,
  );

  revalidatePath("/dashboard/usuarios");
}

export async function eliminarUsuario(formData: FormData) {
  const admin = await requireJuezSupremo();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  const usuario = await prisma.user.findUniqueOrThrow({ where: { id } });
  if (!ROLES_GESTIONABLES_EN_USUARIOS.includes(usuario.role as (typeof ROLES_GESTIONABLES_EN_USUARIOS)[number])) {
    throw new Error("Esta cuenta no es civil ni de SAPD; gestiónala desde Empleados");
  }

  try {
    await prisma.$transaction([
      prisma.postulacion.deleteMany({ where: { candidatoId: id } }),
      prisma.casoParte.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);
  } catch {
    throw new Error("No se puede eliminar: tiene trámites, solicitudes, casos o registros de servicio a su nombre.");
  }

  await enviarLogDiscord(
    prisma,
    "empleados",
    `🗑️ Cuenta de **${usuario.nombre} ${usuario.apellidos}** eliminada por ${admin.nombre} ${admin.apellidos}.`,
  );

  revalidatePath("/dashboard/usuarios");
}
