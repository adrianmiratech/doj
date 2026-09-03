"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/labels";
import { notificarDiscord } from "@/lib/discord-notify";

async function requireStaff() {
  const session = await auth();
  if (!session?.user || !STAFF_ROLES.includes(session.user.role as (typeof STAFF_ROLES)[number])) {
    throw new Error("No autorizado");
  }
  return session.user;
}

export async function crearAudiencia(formData: FormData) {
  await requireStaff();

  const casoId = String(formData.get("casoId") ?? "");
  const juezId = String(formData.get("juezId") ?? "");
  const fecha = String(formData.get("fecha") ?? "");
  const lugar = String(formData.get("lugar") ?? "Sala de Audiencias 1").trim();
  const notas = String(formData.get("notas") ?? "").trim();
  if (!casoId || !juezId || !fecha) throw new Error("Datos incompletos");

  const audiencia = await prisma.audiencia.create({
    data: { casoId, juezId, fecha: new Date(fecha), lugar: lugar || "Sala de Audiencias 1", notas: notas || null },
    include: { caso: { include: { partesRelacionadas: { include: { user: true } } } } },
  });

  for (const parte of audiencia.caso.partesRelacionadas) {
    await notificarDiscord(
      parte.user.discordId,
      `📅 Se ha programado una audiencia para el expediente **${audiencia.caso.titulo}**: ${new Date(audiencia.fecha).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })} en ${audiencia.lugar}.`,
    );
  }

  revalidatePath(`/dashboard/casos/${casoId}`);
  revalidatePath("/dashboard/audiencias");
  revalidatePath("/portal/juicios");
}
