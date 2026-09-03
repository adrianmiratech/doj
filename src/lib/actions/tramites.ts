"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES, ROLE_LABELS, ESTADO_SOLICITUD_LABELS } from "@/lib/labels";
import { notificarDiscord, notificarDiscordConAdjunto } from "@/lib/discord-notify";
import { enviarLogDiscord } from "@/lib/discord-logs";
import { notificarRoles, notificarUsuario } from "@/lib/notificaciones";
import { generarCertificadoAntecedentesPdf } from "@/lib/certificado-pdf";
import type { EstadoSolicitud, Role } from "@/generated/prisma/enums";

async function requireStaff() {
  const session = await auth();
  if (!session?.user || !STAFF_ROLES.includes(session.user.role as (typeof STAFF_ROLES)[number])) {
    throw new Error("No autorizado");
  }
  return session.user;
}

export async function crearTramite(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const tipoId = String(formData.get("tipoId") ?? "");
  const detalle = String(formData.get("detalle") ?? "").trim();
  if (!tipoId || !detalle) throw new Error("Datos incompletos");

  const tipo = await prisma.tipoTramite.findUniqueOrThrow({ where: { id: tipoId } });
  const esStaff = STAFF_ROLES.includes(session.user.role as (typeof STAFF_ROLES)[number]);
  // Los tramites externos son para cualquier persona, incluido el personal del departamento;
  // los internos son solo para el personal.
  const alcanceValido = tipo.alcance === "EXTERNO" || (esStaff && tipo.alcance === "INTERNO");
  if (!tipo.activo || !alcanceValido) throw new Error("Este trámite no está disponible para tu perfil");

  await prisma.tramite.create({
    data: { tipoId, detalle, ciudadanoId: session.user.id },
  });

  await enviarLogDiscord(
    prisma,
    "tramites",
    `📥 Nuevo trámite: **${tipo.nombre}** de ${session.user.nombre} ${session.user.apellidos}. Revísalo en Trámites y Solicitudes.`,
  );
  await notificarRoles(STAFF_ROLES as unknown as Role[], {
    tipo: "tramite",
    titulo: "Nuevo trámite recibido",
    mensaje: `${tipo.nombre} · ${session.user.nombre} ${session.user.apellidos}`,
    enlace: "/dashboard/solicitudes",
  });

  revalidatePath("/portal/tramites");
  revalidatePath("/dashboard/tramites");
  revalidatePath("/dashboard/solicitudes");
}

function esTramiteDeAntecedentes(nombreTipo: string) {
  return nombreTipo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .includes("antecedentes");
}

export async function actualizarTramite(formData: FormData) {
  const staff = await requireStaff();

  const id = String(formData.get("id") ?? "");
  const estado = String(formData.get("estado") ?? "");
  const respuesta = String(formData.get("respuesta") ?? "").trim();
  const tieneAntecedentes = formData.get("tieneAntecedentes");
  if (!id || !estado) throw new Error("Datos incompletos");

  let tramite = await prisma.tramite.update({
    where: { id },
    data: {
      estado: estado as EstadoSolicitud,
      respuesta: respuesta || null,
      empleadoId: staff.id,
    },
    include: { ciudadano: true, tipo: true },
  });

  let avisoCertificado = "";
  if (esTramiteDeAntecedentes(tramite.tipo.nombre) && (tieneAntecedentes === "si" || tieneAntecedentes === "no")) {
    const pdf = await generarCertificadoAntecedentesPdf({
      nombreCiudadano: `${tramite.ciudadano.nombre} ${tramite.ciudadano.apellidos}`,
      tieneAntecedentes: tieneAntecedentes === "si",
      detalle: respuesta || null,
      firmante: `${staff.nombre} ${staff.apellidos}`,
      rangoFirmante: ROLE_LABELS[staff.role],
      fecha: new Date(),
      numeroReferencia: `DOJ-CERT-${new Date().getFullYear()}-${tramite.id.slice(-6).toUpperCase()}`,
    });

    tramite = await prisma.tramite.update({
      where: { id },
      data: { certificadoPdf: new Uint8Array(pdf) },
      include: { ciudadano: true, tipo: true },
    });

    await notificarDiscordConAdjunto(
      tramite.ciudadano.discordId,
      `📄 Tu **${tramite.tipo.nombre}** ya está listo. Adjunto tienes el documento oficial; también puedes descargarlo desde el portal (Trámites).`,
      { nombre: "certificado-antecedentes.pdf", datos: pdf, tipoMime: "application/pdf" },
    );
    await notificarUsuario(tramite.ciudadanoId, {
      tipo: "tramite",
      titulo: "Certificado de antecedentes listo",
      mensaje: "Ya puedes descargar tu certificado.",
      enlace: "/portal/tramites",
    });
    avisoCertificado = " El certificado en PDF ya está generado y disponible para el ciudadano.";
  }

  await notificarDiscord(
    tramite.ciudadano.discordId,
    `📄 Tu trámite **${tramite.tipo.nombre}** ha cambiado de estado a **${ESTADO_SOLICITUD_LABELS[tramite.estado]}**.${
      tramite.respuesta ? `\nRespuesta: ${tramite.respuesta}` : ""
    }`,
  );
  await notificarUsuario(tramite.ciudadanoId, {
    tipo: "tramite",
    titulo: "Tu trámite ha sido actualizado",
    mensaje: `${tramite.tipo.nombre} · ${ESTADO_SOLICITUD_LABELS[tramite.estado]}${avisoCertificado}`,
    enlace: "/portal/tramites",
  });

  revalidatePath("/dashboard/tramites");
  revalidatePath("/dashboard/solicitudes");
  revalidatePath("/portal/tramites");
}
