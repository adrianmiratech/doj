"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notificarDiscord } from "@/lib/discord-notify";
import type { EstadoContratoLaboral } from "@/generated/prisma/enums";

export type FirmarContratoState = { error: string | null; success: boolean };

async function requireJuezSupremo() {
  const session = await auth();
  if (!session?.user || session.user.role !== "JUEZ_SUPREMO") {
    throw new Error("No autorizado");
  }
  return session.user;
}

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE_FIRMA: "Pendiente de firma",
  ACTIVO: "Activo",
  FINALIZADO: "Finalizado",
};

/** Crea (envía) un contrato laboral nuevo para un empleado ya existente, ej. para un ascenso o renovación. */
export async function crearContratoLaboral(formData: FormData) {
  await requireJuezSupremo();

  const userId = String(formData.get("userId") ?? "");
  const puesto = String(formData.get("puesto") ?? "").trim();
  const salarioBase = Number(formData.get("salarioBase") ?? 0);
  const condiciones = String(formData.get("condiciones") ?? "").trim();
  if (!userId || !puesto || Number.isNaN(salarioBase) || salarioBase <= 0) throw new Error("Datos incompletos");

  const contrato = await prisma.contratoLaboral.create({
    data: { userId, puesto, salarioBase, condiciones: condiciones || null, estado: "PENDIENTE_FIRMA" },
    include: { user: true },
  });

  await notificarDiscord(
    contrato.user.discordId,
    `📑 Tienes un nuevo contrato laboral (**${contrato.puesto}**, $${contrato.salarioBase}/h) pendiente de firma. Entra al portal para revisarlo y firmarlo.`,
  );

  revalidatePath("/dashboard/mi-contrato");
}

/** Reenvía por Discord la notificación del estado actual de un contrato laboral. */
export async function reenviarContratoLaboral(formData: FormData) {
  await requireJuezSupremo();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  const contrato = await prisma.contratoLaboral.findUniqueOrThrow({ where: { id }, include: { user: true } });
  const mensaje =
    contrato.estado === "PENDIENTE_FIRMA"
      ? `📑 Recordatorio: tienes el contrato laboral (**${contrato.puesto}**, $${contrato.salarioBase}/h) pendiente de firma. Entra al portal para firmarlo.`
      : `📑 Tu contrato laboral (**${contrato.puesto}**) está **${ESTADO_LABEL[contrato.estado]}**.`;
  await notificarDiscord(contrato.user.discordId, mensaje);

  revalidatePath("/dashboard/mi-contrato");
}

export async function actualizarContratoLaboral(formData: FormData) {
  await requireJuezSupremo();

  const id = String(formData.get("id") ?? "");
  const puesto = String(formData.get("puesto") ?? "").trim();
  const salarioBase = Number(formData.get("salarioBase") ?? 0);
  const condiciones = String(formData.get("condiciones") ?? "").trim();
  const estado = String(formData.get("estado") ?? "ACTIVO") as EstadoContratoLaboral;
  if (!id || !puesto || Number.isNaN(salarioBase)) throw new Error("Datos incompletos");

  const contrato = await prisma.contratoLaboral.update({
    where: { id },
    data: { puesto, salarioBase, condiciones: condiciones || null, estado },
    include: { user: true },
  });

  await notificarDiscord(
    contrato.user.discordId,
    `📑 Tu contrato laboral (${contrato.puesto}) ha cambiado a **${ESTADO_LABEL[contrato.estado]}**.`,
  );

  revalidatePath("/dashboard/mi-contrato");
}

export async function firmarContratoLaboral(
  _prev: FirmarContratoState,
  formData: FormData,
): Promise<FirmarContratoState> {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!id || !password) return { error: "Introduce tu contraseña para firmar.", success: false };

  const contrato = await prisma.contratoLaboral.findUnique({ where: { id } });
  if (!contrato || contrato.userId !== session.user.id || contrato.estado !== "PENDIENTE_FIRMA") {
    return { error: "Este contrato no se puede firmar.", success: false };
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { error: "Contraseña incorrecta.", success: false };

  await prisma.contratoLaboral.update({ where: { id }, data: { estado: "ACTIVO" } });

  revalidatePath("/dashboard/mi-contrato");
  return { error: null, success: true };
}
