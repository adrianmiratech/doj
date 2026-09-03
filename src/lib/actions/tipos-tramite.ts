"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { AlcanceTramite } from "@/generated/prisma/enums";

async function requireJuezSupremo() {
  const session = await auth();
  if (!session?.user || session.user.role !== "JUEZ_SUPREMO") {
    throw new Error("No autorizado");
  }
  return session.user;
}

export async function crearTipoTramite(formData: FormData) {
  await requireJuezSupremo();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const requisitos = String(formData.get("requisitos") ?? "").trim();
  const costo = Number(formData.get("costo") ?? 0) || 0;
  const alcance = String(formData.get("alcance") ?? "EXTERNO") as AlcanceTramite;
  if (!nombre || !descripcion) throw new Error("Datos incompletos");

  await prisma.tipoTramite.create({
    data: { nombre, descripcion, requisitos: requisitos || null, costo, alcance },
  });

  revalidatePath("/dashboard/solicitudes");
  revalidatePath("/portal/tramites");
}

export async function actualizarTipoTramite(formData: FormData) {
  await requireJuezSupremo();

  const id = String(formData.get("id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const requisitos = String(formData.get("requisitos") ?? "").trim();
  const costo = Number(formData.get("costo") ?? 0) || 0;
  const alcance = String(formData.get("alcance") ?? "EXTERNO") as AlcanceTramite;
  if (!id || !nombre || !descripcion) throw new Error("Datos incompletos");

  await prisma.tipoTramite.update({
    where: { id },
    data: { nombre, descripcion, requisitos: requisitos || null, costo, alcance },
  });

  revalidatePath("/dashboard/solicitudes");
  revalidatePath("/portal/tramites");
}

export async function alternarActivoTipoTramite(formData: FormData) {
  await requireJuezSupremo();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  const tipo = await prisma.tipoTramite.findUniqueOrThrow({ where: { id } });
  await prisma.tipoTramite.update({ where: { id }, data: { activo: !tipo.activo } });

  revalidatePath("/dashboard/solicitudes");
  revalidatePath("/portal/tramites");
}
