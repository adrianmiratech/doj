"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import { STAFF_ROLES, TARIFA_HORA_MINIMA } from "@/lib/labels";
import { requirePermiso } from "@/lib/permisos";

export async function actualizarTarifaRango(formData: FormData) {
  await requirePermiso("GESTIONAR_NOMINAS");

  const role = String(formData.get("role") ?? "") as Role;
  const tarifaHora = Math.max(TARIFA_HORA_MINIMA, Number(formData.get("tarifaHora") ?? TARIFA_HORA_MINIMA) || TARIFA_HORA_MINIMA);

  if (!STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number])) throw new Error("Rango inválido");

  await prisma.tarifaRango.upsert({
    where: { role },
    create: { role, tarifaHora },
    update: { tarifaHora },
  });

  revalidatePath("/dashboard/nominas");
}
