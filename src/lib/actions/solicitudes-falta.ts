"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/labels";
import { notificarDiscord } from "@/lib/discord-notify";
import { notificarConPermiso } from "@/lib/notificaciones";
import { guardarArchivoEvidencia } from "@/lib/uploads";
import type { Gravedad } from "@/generated/prisma/enums";

async function requireStaff() {
  const session = await auth();
  if (!session?.user || !STAFF_ROLES.includes(session.user.role as (typeof STAFF_ROLES)[number])) {
    throw new Error("No autorizado");
  }
  return session.user;
}

async function requireJuezSupremo() {
  const session = await auth();
  if (!session?.user || session.user.role !== "JUEZ_SUPREMO") {
    throw new Error("No autorizado");
  }
  return session.user;
}

export async function crearSolicitudFalta(formData: FormData) {
  const autor = await requireStaff();

  const reportadoId = String(formData.get("reportadoId") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const gravedad = String(formData.get("gravedad") ?? "LEVE") as Gravedad;
  const evidenciasLink = String(formData.get("evidencias") ?? "").trim();
  const archivoEvidencia = formData.get("evidenciasArchivo");

  if (!reportadoId || !titulo) throw new Error("Datos incompletos");

  const evidenciasArchivo = await guardarArchivoEvidencia(
    archivoEvidencia instanceof File ? archivoEvidencia : null,
    "evidencias",
  );
  const evidencias = evidenciasArchivo || evidenciasLink || null;

  await prisma.solicitudFalta.create({
    data: {
      reportadoId,
      autorId: autor.id,
      titulo,
      descripcion: descripcion || null,
      gravedad,
      evidencias,
    },
  });

  await notificarConPermiso(
    "GESTIONAR_FALTAS",
    {
      tipo: "falta",
      titulo: "Nueva solicitud de falta",
      mensaje: `${titulo} · reportado por ${autor.nombre} ${autor.apellidos}`,
      enlace: "/dashboard/faltas",
    },
  );

  revalidatePath("/dashboard/faltas");
}

export async function marcarEnRevision(formData: FormData) {
  await requireJuezSupremo();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  await prisma.solicitudFalta.update({ where: { id }, data: { estado: "EN_REVISION" } });

  revalidatePath("/dashboard/faltas");
}

export async function aprobarSolicitudFalta(formData: FormData) {
  const juezSupremo = await requireJuezSupremo();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  const solicitud = await prisma.solicitudFalta.findUniqueOrThrow({
    where: { id },
    include: { reportado: true, autor: true },
  });

  const falta = await prisma.falta.create({
    data: {
      empleadoId: solicitud.reportadoId,
      autorId: juezSupremo.id,
      motivo: solicitud.titulo + (solicitud.descripcion ? ` — ${solicitud.descripcion}` : ""),
      gravedad: solicitud.gravedad,
    },
  });

  await prisma.solicitudFalta.update({
    where: { id },
    data: { estado: "APROBADA", faltaId: falta.id },
  });

  await notificarDiscord(
    solicitud.reportado.discordId,
    `⚠️ Se te ha impuesto una falta: **${solicitud.titulo}**. Revísala y reconócela desde el portal (Faltas).`,
  );
  await notificarDiscord(
    solicitud.autor.discordId,
    `✅ Tu solicitud de falta contra ${solicitud.reportado.nombre} ${solicitud.reportado.apellidos} (**${solicitud.titulo}**) fue aprobada.`,
  );

  revalidatePath("/dashboard/faltas");
  revalidatePath("/dashboard");
}

export async function rechazarSolicitudFalta(formData: FormData) {
  await requireJuezSupremo();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  const solicitud = await prisma.solicitudFalta.update({
    where: { id },
    data: { estado: "RECHAZADA" },
    include: { autor: true, reportado: true },
  });

  await notificarDiscord(
    solicitud.autor.discordId,
    `❌ Tu solicitud de falta contra ${solicitud.reportado.nombre} ${solicitud.reportado.apellidos} (**${solicitud.titulo}**) fue rechazada.`,
  );

  revalidatePath("/dashboard/faltas");
}
