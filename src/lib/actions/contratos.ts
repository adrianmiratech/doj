"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/labels";
import type { EstadoContrato } from "@/generated/prisma/enums";

async function requireStaff() {
  const session = await auth();
  if (!session?.user || !STAFF_ROLES.includes(session.user.role as (typeof STAFF_ROLES)[number])) {
    throw new Error("No autorizado");
  }
  return session.user;
}

export async function crearContrato(formData: FormData) {
  const staff = await requireStaff();

  const tipo = String(formData.get("tipo") ?? "").trim();
  const partes = String(formData.get("partes") ?? "").trim();
  const detalle = String(formData.get("detalle") ?? "").trim();
  if (!tipo || !partes) throw new Error("Datos incompletos");

  await prisma.contrato.create({
    data: { tipo, partes, detalle: detalle || null, redactorId: staff.id },
  });

  revalidatePath("/dashboard/contratos");
  revalidatePath("/dashboard");
}

export async function actualizarEstadoContrato(formData: FormData) {
  await requireStaff();

  const id = String(formData.get("id") ?? "");
  const estado = String(formData.get("estado") ?? "");
  if (!id || !estado) throw new Error("Datos incompletos");

  await prisma.contrato.update({ where: { id }, data: { estado: estado as EstadoContrato } });

  revalidatePath("/dashboard/contratos");
  revalidatePath("/dashboard");
}
