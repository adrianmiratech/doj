"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { enviarMensajeCanal, reaccionarMensaje } from "@/lib/discord-control";
import { notificarDiscord } from "@/lib/discord-notify";

// Canal de Discord vinculado con el buzón de Quejas y Sugerencias de la web:
// lo publicado aquí llega también a ese canal, y el bot hace el camino
// inverso (ver manejarMensajeSugerencia en bot/index.ts).
const CANAL_SUGERENCIAS_ID = "1541396617079558164";

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  ACEPTADA: "Aceptada",
  RECHAZADA: "Rechazada",
};

export async function enviarFeedback(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const tipo = String(formData.get("tipo") ?? "Sugerencia");
  const contenido = String(formData.get("contenido") ?? "").trim();
  const anonimo = formData.get("anonimo") === "on";
  if (!contenido) throw new Error("Datos incompletos");

  const autor = anonimo ? "Anónimo" : `${session.user.nombre} ${session.user.apellidos}`;
  const resultado = await enviarMensajeCanal(CANAL_SUGERENCIAS_ID, `📢 **Nueva ${tipo.toLowerCase()}** de ${autor}:\n${contenido}`);
  if (resultado.messageId) {
    await reaccionarMensaje(CANAL_SUGERENCIAS_ID, resultado.messageId, "👍");
  }

  await prisma.feedback.create({
    data: {
      tipo,
      contenido,
      anonimo,
      autorId: anonimo ? null : session.user.id,
      discordMessageId: resultado.messageId ?? null,
    },
  });

  revalidatePath("/dashboard/feedback");
}

/** Juez Supremo: cambia el estado de una sugerencia/queja. Avisa al autor por DM y responde en el propio canal de Discord. */
export async function cambiarEstadoFeedback(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "JUEZ_SUPREMO") throw new Error("No autorizado");

  const id = String(formData.get("id") ?? "");
  const estado = String(formData.get("estado") ?? "");
  if (!id || !["PENDIENTE", "ACEPTADA", "RECHAZADA"].includes(estado)) throw new Error("Datos incompletos");

  const feedback = await prisma.feedback.update({ where: { id }, data: { estado }, include: { autor: true } });

  if (feedback.autor?.discordId) {
    await notificarDiscord(
      feedback.autor.discordId,
      `📢 Tu ${feedback.tipo.toLowerCase()} ha sido marcada como **${ESTADO_LABEL[estado]}**.`,
    );
  }

  await enviarMensajeCanal(
    CANAL_SUGERENCIAS_ID,
    `Esta ${feedback.tipo.toLowerCase()} ha sido marcada como **${ESTADO_LABEL[estado]}**.`,
    feedback.discordMessageId ? { replyToMessageId: feedback.discordMessageId } : undefined,
  );

  revalidatePath("/dashboard/feedback");
}
