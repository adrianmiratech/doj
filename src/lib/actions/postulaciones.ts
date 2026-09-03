"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import { POSTULABLE_ROLES, ROLE_LABELS } from "@/lib/labels";
import { crearNominaInicial, tarifaHoraDe } from "@/lib/nominas-auto";
import { notificarDiscord } from "@/lib/discord-notify";
import { enviarLogDiscord } from "@/lib/discord-logs";
import { sincronizarMiembroDiscord } from "@/lib/discord-roles";
import { requireJuezSupremo } from "@/lib/permisos";
import { notificarConPermiso } from "@/lib/notificaciones";

async function requireCivil() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CIVIL") throw new Error("No autorizado");
  return session.user;
}

export async function crearPostulacion(formData: FormData) {
  const candidato = await requireCivil();

  const rango = String(formData.get("rango") ?? "") as Role;
  const motivacion = String(formData.get("motivacion") ?? "").trim();
  const experiencia = String(formData.get("experiencia") ?? "").trim();

  if (!POSTULABLE_ROLES.includes(rango as (typeof POSTULABLE_ROLES)[number]) || !motivacion) {
    throw new Error("Datos incompletos o inválidos");
  }

  const existente = await prisma.postulacion.findFirst({
    where: { candidatoId: candidato.id, rango, estado: "PENDIENTE" },
  });
  if (existente) throw new Error("Ya tienes una postulación pendiente a ese rango");

  const preguntas = await prisma.preguntaPostulacion.findMany({ where: { rango, activa: true } });

  const postulacion = await prisma.postulacion.create({
    data: { candidatoId: candidato.id, rango, motivacion, experiencia: experiencia || null },
  });

  for (const pregunta of preguntas) {
    const respuesta = String(formData.get(`pregunta_${pregunta.id}`) ?? "").trim();
    if (respuesta) {
      await prisma.respuestaPostulacion.create({
        data: { postulacionId: postulacion.id, preguntaId: pregunta.id, respuesta },
      });
    }
  }

  await enviarLogDiscord(
    prisma,
    "postulaciones",
    `📮 Nueva postulación de **${candidato.nombre} ${candidato.apellidos}** a **${ROLE_LABELS[rango]}**.`,
  );
  await notificarConPermiso("GESTIONAR_POSTULACIONES", {
    tipo: "postulacion",
    titulo: "Nueva postulación",
    mensaje: `${candidato.nombre} ${candidato.apellidos} → ${ROLE_LABELS[rango]}`,
    enlace: "/dashboard/postulaciones",
  });

  revalidatePath("/portal/postulaciones");
}

export async function aprobarPostulacion(formData: FormData) {
  const juezSupremo = await requireJuezSupremo();

  const id = String(formData.get("id") ?? "");
  const cargo = String(formData.get("cargo") ?? "").trim();
  if (!id) throw new Error("Datos incompletos");

  const postulacion = await prisma.postulacion.findUniqueOrThrow({
    where: { id },
    include: { candidato: true },
  });
  if (postulacion.estado !== "PENDIENTE") throw new Error("Esta postulación ya fue resuelta");

  const count = await prisma.user.count();
  const legajo = postulacion.candidato.legajo ?? String(1000 + count);

  await prisma.user.update({
    where: { id: postulacion.candidatoId },
    data: { role: postulacion.rango, legajo, cargo: cargo || null },
  });

  await prisma.contratoLaboral.create({
    data: {
      userId: postulacion.candidatoId,
      puesto: cargo || ROLE_LABELS[postulacion.rango],
      salarioBase: await tarifaHoraDe(prisma, postulacion.candidatoId),
    },
  });

  await crearNominaInicial(prisma, postulacion.candidatoId);

  await prisma.postulacion.update({
    where: { id },
    data: { estado: "APROBADA", revisadaPorId: juezSupremo.id },
  });

  // El resto de postulaciones pendientes del mismo candidato ya no aplican: ya tiene rango.
  await prisma.postulacion.updateMany({
    where: { candidatoId: postulacion.candidatoId, estado: "PENDIENTE", id: { not: id } },
    data: { estado: "RECHAZADA", respuesta: "Cerrada automáticamente: el candidato ya fue admitido en otro rango." },
  });

  await sincronizarMiembroDiscord(
    postulacion.candidato.discordId,
    postulacion.rango,
    `${postulacion.candidato.nombre} ${postulacion.candidato.apellidos} - #${legajo}`,
  );

  await notificarDiscord(
    postulacion.candidato.discordId,
    `🏛️ ¡Tu postulación a **${ROLE_LABELS[postulacion.rango]}** ha sido aprobada! Ya tienes un contrato laboral pendiente de firmar en el portal.`,
  );
  await enviarLogDiscord(
    prisma,
    "postulaciones",
    `✅ Postulación de **${postulacion.candidato.nombre} ${postulacion.candidato.apellidos}** a **${ROLE_LABELS[postulacion.rango]}** aprobada por ${juezSupremo.nombre} ${juezSupremo.apellidos}.`,
  );

  revalidatePath("/dashboard/postulaciones");
  revalidatePath("/portal/postulaciones");
}

export async function rechazarPostulacion(formData: FormData) {
  const juezSupremo = await requireJuezSupremo();

  const id = String(formData.get("id") ?? "");
  const respuesta = String(formData.get("respuesta") ?? "").trim();
  if (!id) throw new Error("Datos incompletos");

  const postulacion = await prisma.postulacion.findUniqueOrThrow({ where: { id }, include: { candidato: true } });
  if (postulacion.estado !== "PENDIENTE") throw new Error("Esta postulación ya fue resuelta");

  await prisma.postulacion.update({
    where: { id },
    data: { estado: "RECHAZADA", respuesta: respuesta || null },
  });

  await notificarDiscord(
    postulacion.candidato.discordId,
    `📋 Tu postulación a **${ROLE_LABELS[postulacion.rango]}** ha sido rechazada.${respuesta ? ` Motivo: ${respuesta}` : ""}`,
  );
  await enviarLogDiscord(
    prisma,
    "postulaciones",
    `❌ Postulación de **${postulacion.candidato.nombre} ${postulacion.candidato.apellidos}** a **${ROLE_LABELS[postulacion.rango]}** rechazada por ${juezSupremo.nombre} ${juezSupremo.apellidos}.`,
  );

  revalidatePath("/dashboard/postulaciones");
  revalidatePath("/portal/postulaciones");
}

export async function crearPreguntaPostulacion(formData: FormData) {
  await requireJuezSupremo();
  const rango = String(formData.get("rango") ?? "") as Role;
  const texto = String(formData.get("texto") ?? "").trim();
  if (!POSTULABLE_ROLES.includes(rango as (typeof POSTULABLE_ROLES)[number]) || !texto) {
    throw new Error("Datos incompletos o inválidos");
  }

  const count = await prisma.preguntaPostulacion.count({ where: { rango } });
  await prisma.preguntaPostulacion.create({ data: { rango, texto, orden: count } });

  revalidatePath("/dashboard/postulaciones");
  revalidatePath("/portal/postulaciones");
}

export async function alternarActivaPreguntaPostulacion(formData: FormData) {
  await requireJuezSupremo();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  const pregunta = await prisma.preguntaPostulacion.findUniqueOrThrow({ where: { id } });
  await prisma.preguntaPostulacion.update({ where: { id }, data: { activa: !pregunta.activa } });

  revalidatePath("/dashboard/postulaciones");
  revalidatePath("/portal/postulaciones");
}
