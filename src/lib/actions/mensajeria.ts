"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const NOMBRE_GRUPO_GENERAL = "Grupo general";

/** Crea (si falta) el grupo general del personal y asegura que el usuario esté dentro. Devuelve su id. */
export async function asegurarGrupoGeneral(userId: string): Promise<string> {
  let grupo = await prisma.conversacion.findFirst({ where: { tipo: "GRUPO" } });
  if (!grupo) {
    grupo = await prisma.conversacion.create({ data: { tipo: "GRUPO", nombre: NOMBRE_GRUPO_GENERAL } });
  }

  const yaEsta = await prisma.conversacionParticipante.findUnique({
    where: { conversacionId_userId: { conversacionId: grupo.id, userId } },
  });
  if (!yaEsta) {
    await prisma.conversacionParticipante.create({ data: { conversacionId: grupo.id, userId } });
  }
  return grupo.id;
}

export type ConversacionResumen = {
  id: string;
  tipo: string;
  titulo: string;
  ultimoMensaje: string | null;
  ultimaFecha: Date;
  noLeidos: number;
};

/** Conversaciones del usuario, con el último mensaje y el número de no leídos, ordenadas por actividad reciente. */
export async function listarConversacionesDe(userId: string): Promise<ConversacionResumen[]> {
  const participaciones = await prisma.conversacionParticipante.findMany({
    where: { userId },
    include: {
      conversacion: {
        include: {
          participantes: { include: { user: true } },
          mensajes: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  const resumenes = await Promise.all(
    participaciones.map(async (p) => {
      const conv = p.conversacion;
      const otro = conv.tipo === "PRIVADO" ? conv.participantes.find((x) => x.userId !== userId)?.user : null;
      const titulo = conv.tipo === "GRUPO" ? conv.nombre ?? NOMBRE_GRUPO_GENERAL : otro ? `${otro.nombre} ${otro.apellidos}` : "Conversación";
      const ultimo = conv.mensajes[0] ?? null;

      const noLeidos = await prisma.mensaje.count({
        where: {
          conversacionId: conv.id,
          autorId: { not: userId },
          createdAt: { gt: p.ultimaLectura ?? new Date(0) },
        },
      });

      return {
        id: conv.id,
        tipo: conv.tipo,
        titulo,
        ultimoMensaje: ultimo?.contenido ?? null,
        ultimaFecha: ultimo?.createdAt ?? conv.createdAt,
        noLeidos,
      };
    }),
  );

  return resumenes.sort((a, b) => b.ultimaFecha.getTime() - a.ultimaFecha.getTime());
}

/** Abre (o crea) la conversación privada 1 a 1 con otro usuario y navega a ella. */
export async function abrirConversacionPrivada(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const otroId = String(formData.get("otroId") ?? "");
  if (!otroId || otroId === session.user.id) throw new Error("Destinatario inválido");

  const existente = await prisma.conversacion.findFirst({
    where: {
      tipo: "PRIVADO",
      AND: [{ participantes: { some: { userId: session.user.id } } }, { participantes: { some: { userId: otroId } } }],
    },
  });

  const conversacionId =
    existente?.id ??
    (
      await prisma.conversacion.create({
        data: { tipo: "PRIVADO", participantes: { create: [{ userId: session.user.id }, { userId: otroId }] } },
      })
    ).id;

  redirect(`/dashboard/mensajeria/${conversacionId}`);
}

/** Marca la conversación como leída para el usuario actual (llamado al abrirla). */
export async function marcarConversacionLeida(conversacionId: string) {
  const session = await auth();
  if (!session?.user) return;
  await prisma.conversacionParticipante.updateMany({
    where: { conversacionId, userId: session.user.id },
    data: { ultimaLectura: new Date() },
  });
}

export async function enviarMensaje(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const conversacionId = String(formData.get("conversacionId") ?? "");
  const contenido = String(formData.get("contenido") ?? "").trim();
  if (!conversacionId || !contenido) return;

  const participa = await prisma.conversacionParticipante.findUnique({
    where: { conversacionId_userId: { conversacionId, userId: session.user.id } },
  });
  if (!participa) throw new Error("No autorizado");

  await prisma.mensaje.create({ data: { conversacionId, autorId: session.user.id, contenido } });
  await prisma.conversacionParticipante.update({
    where: { conversacionId_userId: { conversacionId, userId: session.user.id } },
    data: { ultimaLectura: new Date() },
  });

  revalidatePath(`/dashboard/mensajeria/${conversacionId}`);
  revalidatePath("/dashboard/mensajeria");
}
