"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES, ESTADO_SOLICITUD_LABELS } from "@/lib/labels";
import { notificarDiscord } from "@/lib/discord-notify";
import type { EstadoSolicitud } from "@/generated/prisma/enums";

const CATEGORIAS = ["Apelacion", "Queja", "Peticion", "Denuncia civil", "Otro"] as const;

async function requireStaff() {
  const session = await auth();
  if (!session?.user || !STAFF_ROLES.includes(session.user.role as (typeof STAFF_ROLES)[number])) {
    throw new Error("No autorizado");
  }
  return session.user;
}

export async function crearSolicitud(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const asunto = String(formData.get("asunto") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "");
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  if (!asunto || !descripcion || !CATEGORIAS.includes(categoria as (typeof CATEGORIAS)[number])) {
    throw new Error("Datos incompletos");
  }

  await prisma.solicitud.create({
    data: { asunto, categoria, descripcion, ciudadanoId: session.user.id },
  });

  revalidatePath("/portal/solicitudes");
  revalidatePath("/dashboard/solicitudes");
}

export async function actualizarSolicitud(formData: FormData) {
  const staff = await requireStaff();

  const id = String(formData.get("id") ?? "");
  const estado = String(formData.get("estado") ?? "");
  const respuesta = String(formData.get("respuesta") ?? "").trim();
  if (!id || !estado) throw new Error("Datos incompletos");

  const solicitud = await prisma.solicitud.update({
    where: { id },
    data: {
      estado: estado as EstadoSolicitud,
      respuesta: respuesta || null,
      empleadoId: staff.id,
    },
    include: { ciudadano: true },
  });

  await notificarDiscord(
    solicitud.ciudadano.discordId,
    `📋 Tu solicitud **${solicitud.asunto}** ha cambiado de estado a **${ESTADO_SOLICITUD_LABELS[solicitud.estado]}**.${
      solicitud.respuesta ? `\nRespuesta: ${solicitud.respuesta}` : ""
    }`,
  );

  revalidatePath("/dashboard/solicitudes");
  revalidatePath("/portal/solicitudes");
}
