"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ESTADO_EXAMEN_LABELS } from "@/lib/labels";
import { notificarDiscord } from "@/lib/discord-notify";
import type { EstadoExamen } from "@/generated/prisma/enums";

async function requireJuezSupremo() {
  const session = await auth();
  if (!session?.user || session.user.role !== "JUEZ_SUPREMO") {
    throw new Error("No autorizado");
  }
  return session.user;
}

export async function crearPlantillaExamen(formData: FormData) {
  const juezSupremo = await requireJuezSupremo();

  const titulo = String(formData.get("titulo") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const preguntas = String(formData.get("preguntas") ?? "").trim();
  if (!titulo || !preguntas) throw new Error("Datos incompletos");

  await prisma.plantillaExamen.create({
    data: { titulo, descripcion, preguntas, creadoPorId: juezSupremo.id },
  });

  revalidatePath("/dashboard/examenes");
}

export async function alternarActivoPlantilla(formData: FormData) {
  await requireJuezSupremo();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  const plantilla = await prisma.plantillaExamen.findUniqueOrThrow({ where: { id } });
  await prisma.plantillaExamen.update({ where: { id }, data: { activo: !plantilla.activo } });

  revalidatePath("/dashboard/examenes");
}

export async function asignarExamen(formData: FormData) {
  const juezSupremo = await requireJuezSupremo();

  const empleadoId = String(formData.get("empleadoId") ?? "");
  const plantillaId = String(formData.get("plantillaId") ?? "");
  if (!empleadoId || !plantillaId) throw new Error("Datos incompletos");

  const plantilla = await prisma.plantillaExamen.findUniqueOrThrow({ where: { id: plantillaId } });

  const empleado = await prisma.user.findUniqueOrThrow({ where: { id: empleadoId } });
  await prisma.examen.create({
    data: {
      plantillaId,
      titulo: plantilla.titulo,
      descripcion: plantilla.descripcion,
      empleadoId,
      asignadoPorId: juezSupremo.id,
    },
  });

  await notificarDiscord(
    empleado.discordId,
    `📝 Se te ha asignado el examen **${plantilla.titulo}**. Revísalo desde el portal (Exámenes).`,
  );

  revalidatePath("/dashboard/examenes");
}

export async function calificarExamen(formData: FormData) {
  await requireJuezSupremo();

  const id = String(formData.get("id") ?? "");
  const estado = String(formData.get("estado") ?? "") as EstadoExamen;
  const resultado = String(formData.get("resultado") ?? "").trim();
  if (!id || !estado) throw new Error("Datos incompletos");

  const examen = await prisma.examen.update({
    where: { id },
    data: { estado, resultado: resultado || null },
    include: { empleado: true },
  });

  await notificarDiscord(
    examen.empleado.discordId,
    `📝 Tu examen **${examen.titulo}** ha sido calificado: **${ESTADO_EXAMEN_LABELS[examen.estado]}**.${
      examen.resultado ? `\n${examen.resultado}` : ""
    }`,
  );

  revalidatePath("/dashboard/examenes");
}
