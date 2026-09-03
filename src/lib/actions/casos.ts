"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES, ESTADO_CASO_LABELS } from "@/lib/labels";
import { notificarDiscord } from "@/lib/discord-notify";
import type { EstadoCaso } from "@/generated/prisma/enums";

async function requireStaff() {
  const session = await auth();
  if (!session?.user || !STAFF_ROLES.includes(session.user.role as (typeof STAFF_ROLES)[number])) {
    throw new Error("No autorizado");
  }
  return session.user;
}

export async function crearCaso(formData: FormData) {
  const staff = await requireStaff();

  const titulo = String(formData.get("titulo") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const partes = String(formData.get("partes") ?? "").trim();
  const civiles = formData.getAll("civiles").map(String).filter(Boolean);
  if (!titulo || !tipo || !descripcion) throw new Error("Datos incompletos");

  const year = new Date().getFullYear();
  const count = await prisma.caso.count();
  const expediente = `DOJ-${year}-${String(count + 1).padStart(4, "0")}`;

  const caso = await prisma.caso.create({
    data: {
      expediente,
      titulo,
      tipo,
      descripcion,
      partes: partes || null,
      responsableId: staff.id,
      partesRelacionadas: civiles.length > 0 ? { create: civiles.map((userId) => ({ userId })) } : undefined,
    },
  });

  revalidatePath("/dashboard/casos");
  redirect(`/dashboard/casos/${caso.id}`);
}

export async function agregarParteCaso(formData: FormData) {
  await requireStaff();
  const casoId = String(formData.get("casoId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const rol = String(formData.get("rol") ?? "Involucrado").trim();
  if (!casoId || !userId) throw new Error("Datos incompletos");

  await prisma.casoParte.upsert({
    where: { casoId_userId: { casoId, userId } },
    update: { rol },
    create: { casoId, userId, rol },
  });

  revalidatePath(`/dashboard/casos/${casoId}`);
}

export async function cambiarEstadoCaso(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  const estado = String(formData.get("estado") ?? "");
  if (!id || !estado) throw new Error("Datos incompletos");

  const caso = await prisma.caso.update({
    where: { id },
    data: { estado: estado as EstadoCaso },
    include: { partesRelacionadas: { include: { user: true } } },
  });

  for (const parte of caso.partesRelacionadas) {
    await notificarDiscord(
      parte.user.discordId,
      `⚖️ El expediente **${caso.titulo}** (${caso.expediente}), en el que estás vinculado como ${parte.rol}, ha cambiado de estado a **${ESTADO_CASO_LABELS[caso.estado]}**.`,
    );
  }

  revalidatePath(`/dashboard/casos/${id}`);
  revalidatePath("/dashboard/casos");
  revalidatePath("/dashboard/mis-juicios");
  revalidatePath("/portal/juicios");
}

export async function agregarNotaCaso(formData: FormData) {
  const staff = await requireStaff();
  const casoId = String(formData.get("casoId") ?? "");
  const contenido = String(formData.get("contenido") ?? "").trim();
  if (!casoId || !contenido) throw new Error("Datos incompletos");

  await prisma.notaCaso.create({ data: { casoId, contenido, autorId: staff.id } });

  revalidatePath(`/dashboard/casos/${casoId}`);
  revalidatePath("/dashboard/mis-juicios");
}
