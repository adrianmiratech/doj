"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES, ESTADO_PLUS_LABELS } from "@/lib/labels";
import { notificarDiscord } from "@/lib/discord-notify";
import type { EstadoPlus, Role } from "@/generated/prisma/enums";

export async function registrarPlusMultiple(formData: FormData) {
  const session = await auth();
  if (!session?.user || !STAFF_ROLES.includes(session.user.role as (typeof STAFF_ROLES)[number])) {
    throw new Error("No autorizado");
  }

  const tipoId = String(formData.get("tipoId") ?? "");
  const semana = String(formData.get("semana") ?? "").trim();
  const notas = String(formData.get("notas") ?? "").trim();
  const agentes = formData.getAll("agentes").map(String).filter(Boolean);

  if (!tipoId || !semana || agentes.length === 0) throw new Error("Datos incompletos");

  const agentesValidos = await prisma.user.findMany({
    where: { id: { in: agentes }, role: { in: STAFF_ROLES as unknown as Role[] } },
    select: { id: true },
  });
  if (agentesValidos.length === 0) throw new Error("Ningún agente válido seleccionado");

  await prisma.plus.createMany({
    data: agentesValidos.map((a) => ({
      tipoId,
      userId: a.id,
      semana,
      notas: notas || null,
    })),
  });

  revalidatePath("/dashboard/pluses");
}

export async function gestionarPlus(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "JUEZ_SUPREMO") {
    throw new Error("No autorizado");
  }

  const id = String(formData.get("id") ?? "");
  const estado = String(formData.get("estado") ?? "") as EstadoPlus;
  if (!id || !estado) throw new Error("Datos incompletos");

  const plus = await prisma.plus.update({ where: { id }, data: { estado }, include: { user: true, tipo: true } });

  await notificarDiscord(
    plus.user.discordId,
    `🎁 Tu plus **${plus.tipo.nombre}** (${plus.semana}) ha cambiado a **${ESTADO_PLUS_LABELS[plus.estado]}**.`,
  );

  revalidatePath("/dashboard/pluses");
}
