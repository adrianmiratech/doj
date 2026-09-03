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

  const ESTADO_LABEL: Record<string, string> = {
    PENDIENTE_FIRMA: "Pendiente de firma",
    ACTIVO: "Activo",
    FINALIZADO: "Finalizado",
  };
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
