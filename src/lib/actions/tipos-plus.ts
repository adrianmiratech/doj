"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireJuezSupremo() {
  const session = await auth();
  if (!session?.user || session.user.role !== "JUEZ_SUPREMO") {
    throw new Error("No autorizado");
  }
  return session.user;
}

export async function crearTipoPlus(formData: FormData) {
  await requireJuezSupremo();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const monto = Number(formData.get("monto") ?? 0);
  if (!nombre || Number.isNaN(monto) || monto < 0) throw new Error("Datos incompletos");

  await prisma.tipoPlus.create({ data: { nombre, descripcion: descripcion || null, monto } });

  revalidatePath("/dashboard/pluses");
}

export async function actualizarTipoPlus(formData: FormData) {
  await requireJuezSupremo();

  const id = String(formData.get("id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const monto = Number(formData.get("monto") ?? 0);
  if (!id || !nombre || Number.isNaN(monto) || monto < 0) throw new Error("Datos incompletos");

  await prisma.tipoPlus.update({
    where: { id },
    data: { nombre, descripcion: descripcion || null, monto },
  });

  revalidatePath("/dashboard/pluses");
}

export async function alternarActivoTipoPlus(formData: FormData) {
  await requireJuezSupremo();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  const tipo = await prisma.tipoPlus.findUniqueOrThrow({ where: { id } });
  await prisma.tipoPlus.update({ where: { id }, data: { activo: !tipo.activo } });

  revalidatePath("/dashboard/pluses");
}
