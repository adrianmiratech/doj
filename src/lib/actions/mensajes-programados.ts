"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireJuezSupremo } from "@/lib/permisos";
import { enviarLogDiscord } from "@/lib/discord-logs";

export async function programarMensajeAction(formData: FormData) {
  const juezSupremo = await requireJuezSupremo();
  const channelId = String(formData.get("channelId") ?? "");
  const channelNombre = String(formData.get("channelNombre") ?? "");
  const mensaje = String(formData.get("mensaje") ?? "").trim();
  const fecha = String(formData.get("enviarEn") ?? "");
  if (!channelId || !mensaje || !fecha) return { ok: false, error: "Faltan datos" };

  const enviarEn = new Date(fecha);
  if (Number.isNaN(enviarEn.getTime()) || enviarEn.getTime() <= Date.now()) {
    return { ok: false, error: "La fecha debe ser futura" };
  }

  await prisma.mensajeProgramado.create({
    data: { channelId, channelNombre, mensaje, enviarEn, creadoPorId: juezSupremo.id },
  });

  await enviarLogDiscord(
    prisma,
    "actividad",
    `🗓️ ${juezSupremo.nombre} ${juezSupremo.apellidos} programó un mensaje para <#${channelId}> el ${enviarEn.toLocaleString("es-ES")}.`,
  );

  revalidatePath("/dashboard/seguridad");
  return { ok: true };
}

export async function cancelarMensajeProgramadoAction(formData: FormData) {
  await requireJuezSupremo();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.mensajeProgramado.deleteMany({ where: { id, enviado: false } });
  revalidatePath("/dashboard/seguridad");
}
