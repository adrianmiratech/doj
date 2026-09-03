"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notificarDiscord } from "@/lib/discord-notify";

const NOMBRE_GRUPO_GENERAL = "Grupo general";
// Mientras el "presenteHasta" de un participante siga en el futuro, se asume
// que tiene la conversación abierta en pantalla (heartbeat del cliente) y no
// se le manda aviso por Discord de los mensajes nuevos.
const VENTANA_PRESENCIA_MS = 30_000;

async function esAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role === "JUEZ_SUPREMO";
}

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

/**
 * Conversaciones del usuario, con el último mensaje y el número de no
 * leídos, con el grupo general siempre fijado primero y el resto ordenado
 * por actividad reciente. Todo en un puñado de consultas (nada de N+1 por
 * conversación), porque cada una contra la base remota pesa.
 */
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
  if (participaciones.length === 0) return [];

  const conversacionIds = participaciones.map((p) => p.conversacionId);
  const mensajesAjenos = await prisma.mensaje.findMany({
    where: { conversacionId: { in: conversacionIds }, autorId: { not: userId } },
    select: { conversacionId: true, createdAt: true },
  });

  const resumenes = participaciones.map((p) => {
    const conv = p.conversacion;
    const otro = conv.tipo === "PRIVADO" ? conv.participantes.find((x) => x.userId !== userId)?.user : null;
    const titulo =
      conv.tipo === "GRUPO" ? conv.nombre ?? NOMBRE_GRUPO_GENERAL : otro ? `${otro.nombre} ${otro.apellidos}` : "Conversación";
    const ultimo = conv.mensajes[0] ?? null;
    const desde = p.ultimaLectura ?? new Date(0);
    const noLeidos = mensajesAjenos.filter((m) => m.conversacionId === conv.id && m.createdAt > desde).length;

    return {
      id: conv.id,
      tipo: conv.tipo,
      titulo,
      ultimoMensaje: ultimo?.contenido ?? null,
      ultimaFecha: ultimo?.createdAt ?? conv.createdAt,
      noLeidos,
    };
  });

  return resumenes.sort((a, b) => {
    if (a.tipo === "GRUPO") return -1;
    if (b.tipo === "GRUPO") return 1;
    return b.ultimaFecha.getTime() - a.ultimaFecha.getTime();
  });
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

/** Heartbeat: mientras el cliente lo siga llamando, se asume que la conversación está abierta en pantalla. */
export async function marcarPresencia(conversacionId: string) {
  const session = await auth();
  if (!session?.user) return;
  const presenteHasta = new Date(Date.now() + VENTANA_PRESENCIA_MS);
  await prisma.conversacionParticipante.updateMany({
    where: { conversacionId, userId: session.user.id },
    data: { presenteHasta, ultimaLectura: new Date() },
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

  const ahora = new Date();
  const [, , destinatarios] = await prisma.$transaction([
    prisma.mensaje.create({ data: { conversacionId, autorId: session.user.id, contenido } }),
    prisma.conversacionParticipante.update({
      where: { conversacionId_userId: { conversacionId, userId: session.user.id } },
      data: { ultimaLectura: ahora, presenteHasta: new Date(ahora.getTime() + VENTANA_PRESENCIA_MS) },
    }),
    prisma.conversacionParticipante.findMany({
      where: { conversacionId, userId: { not: session.user.id } },
      include: { user: true },
    }),
  ]);

  const remitente = `${session.user.nombre} ${session.user.apellidos}`;
  const previa = contenido.length > 200 ? `${contenido.slice(0, 200)}…` : contenido;
  for (const destinatario of destinatarios) {
    const ausente = !destinatario.presenteHasta || destinatario.presenteHasta < ahora;
    if (ausente) {
      await notificarDiscord(destinatario.user.discordId, `💬 **${remitente}** te ha escrito: ${previa}`);
    }
  }

  revalidatePath(`/dashboard/mensajeria/${conversacionId}`);
  revalidatePath("/dashboard/mensajeria");
}

/** Borra un mensaje: el propio autor en cualquier momento, o el Juez Supremo (admin) como moderación. */
export async function eliminarMensaje(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const id = String(formData.get("id") ?? "");
  const conversacionId = String(formData.get("conversacionId") ?? "");
  if (!id) throw new Error("Datos incompletos");

  const mensaje = await prisma.mensaje.findUniqueOrThrow({ where: { id } });
  const admin = await esAdmin(session.user.id);
  if (mensaje.autorId !== session.user.id && !admin) throw new Error("No autorizado");

  await prisma.mensaje.delete({ where: { id } });
  revalidatePath(`/dashboard/mensajeria/${conversacionId}`);
}

/** Expulsa a alguien del grupo general. Solo el Juez Supremo (admin), como en un grupo de WhatsApp. */
export async function expulsarDelGrupo(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  if (!(await esAdmin(session.user.id))) throw new Error("No autorizado");

  const conversacionId = String(formData.get("conversacionId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!conversacionId || !userId) throw new Error("Datos incompletos");

  await prisma.conversacionParticipante.deleteMany({ where: { conversacionId, userId } });
  revalidatePath(`/dashboard/mensajeria/${conversacionId}`);
}
