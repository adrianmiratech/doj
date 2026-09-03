"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import { requireJuezSupremo, PERMISOS, type PermisoKey } from "@/lib/permisos";
import { enviarLogDiscord } from "@/lib/discord-logs";
import { ROLE_LABELS } from "@/lib/labels";

export async function alternarPermisoRol(formData: FormData) {
  const juezSupremo = await requireJuezSupremo();

  const role = String(formData.get("role") ?? "") as Role;
  const permiso = String(formData.get("permiso") ?? "") as PermisoKey;
  if (role === "JUEZ_SUPREMO" || !(permiso in PERMISOS)) throw new Error("Datos inválidos");

  const existente = await prisma.rolPermiso.findUnique({ where: { role_permiso: { role, permiso } } });

  if (existente) {
    await prisma.rolPermiso.delete({ where: { id: existente.id } });
    await enviarLogDiscord(
      prisma,
      "permisos",
      `🔒 ${juezSupremo.nombre} ${juezSupremo.apellidos} revocó **${PERMISOS[permiso]}** al rango **${ROLE_LABELS[role]}**.`,
    );
  } else {
    await prisma.rolPermiso.create({ data: { role, permiso } });
    await enviarLogDiscord(
      prisma,
      "permisos",
      `🔓 ${juezSupremo.nombre} ${juezSupremo.apellidos} concedió **${PERMISOS[permiso]}** al rango **${ROLE_LABELS[role]}**.`,
    );
  }

  revalidatePath("/dashboard/permisos");
}
