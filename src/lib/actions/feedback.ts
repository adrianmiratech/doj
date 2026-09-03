"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { enviarMensajeCanal } from "@/lib/discord-control";

// Canal de Discord vinculado con el buzón de Quejas y Sugerencias de la web:
// lo publicado aquí llega también a ese canal, y el bot hace el camino
// inverso (ver manejarMensajeSugerencia en bot/index.ts).
const CANAL_SUGERENCIAS_ID = "1541396617079558164";

export async function enviarFeedback(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const tipo = String(formData.get("tipo") ?? "Sugerencia");
  const contenido = String(formData.get("contenido") ?? "").trim();
  const anonimo = formData.get("anonimo") === "on";
  if (!contenido) throw new Error("Datos incompletos");

  await prisma.feedback.create({
    data: {
      tipo,
      contenido,
      anonimo,
      autorId: anonimo ? null : session.user.id,
    },
  });

  const autor = anonimo ? "Anónimo" : `${session.user.nombre} ${session.user.apellidos}`;
  await enviarMensajeCanal(CANAL_SUGERENCIAS_ID, `📢 **Nueva ${tipo.toLowerCase()}** de ${autor}:\n${contenido}`);

  revalidatePath("/dashboard/feedback");
}
