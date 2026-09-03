"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notificarDiscord } from "@/lib/discord-notify";
import { enviarLogDiscord } from "@/lib/discord-logs";
import { requirePermiso } from "@/lib/permisos";
import { notificarConPermiso } from "@/lib/notificaciones";
import { guardarArchivoEvidencia } from "@/lib/uploads";

async function requireStaff() {
  const session = await auth();
  if (!session?.user || session.user.role === "CIVIL") throw new Error("No autorizado");
  return session.user;
}

async function requireResuelveOrdenes() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  const { role } = session.user;
  if (role === "JUEZ_SUPREMO" || role === "JUEZ_DISTRITO" || role === "FISCAL_GENERAL") return session.user;
  return requirePermiso("RESOLVER_ORDENES");
}

export async function solicitarOrden(formData: FormData) {
  const solicitante = await requireStaff();

  const tipo = String(formData.get("tipo") ?? "").trim();
  const objetivo = String(formData.get("objetivo") ?? "").trim();
  const motivo = String(formData.get("motivo") ?? "").trim();
  const evidenciasLink = String(formData.get("evidencias") ?? "").trim();
  const archivoEvidencia = formData.get("evidenciasArchivo");
  if (!tipo || !objetivo || !motivo) throw new Error("Datos incompletos");

  const evidenciasArchivo = await guardarArchivoEvidencia(
    archivoEvidencia instanceof File ? archivoEvidencia : null,
    "evidencias",
  );
  const evidencias = evidenciasArchivo || evidenciasLink || null;

  await prisma.ordenJudicial.create({
    data: { tipo, objetivo, motivo, evidencias, solicitanteId: solicitante.id },
  });

  await enviarLogDiscord(
    prisma,
    "permisos",
    `📋 Nueva orden judicial solicitada por **${solicitante.nombre} ${solicitante.apellidos}**: ${tipo} — ${objetivo}.`,
  );
  await notificarConPermiso(
    "RESOLVER_ORDENES",
    {
      tipo: "orden",
      titulo: "Nueva orden judicial",
      mensaje: `${tipo} · ${objetivo} · solicitada por ${solicitante.nombre} ${solicitante.apellidos}`,
      enlace: "/dashboard/ordenes",
    },
    ["JUEZ_SUPREMO", "JUEZ_DISTRITO", "FISCAL_GENERAL"],
  );

  revalidatePath("/dashboard/ordenes");
}

export async function resolverOrden(formData: FormData) {
  const juez = await requireResuelveOrdenes();

  const id = String(formData.get("id") ?? "");
  const accion = String(formData.get("accion") ?? "");
  const respuesta = String(formData.get("respuesta") ?? "").trim();
  if (!id || (accion !== "APROBADA" && accion !== "RECHAZADA")) throw new Error("Datos incompletos");

  const orden = await prisma.ordenJudicial.findUniqueOrThrow({ where: { id }, include: { solicitante: true } });
  if (orden.estado !== "PENDIENTE") throw new Error("Esta orden ya fue resuelta");

  await prisma.ordenJudicial.update({
    where: { id },
    data: { estado: accion, respuesta: respuesta || null, resueltaPorId: juez.id },
  });

  await notificarDiscord(
    orden.solicitante.discordId,
    accion === "APROBADA"
      ? `✅ Tu orden judicial de **${orden.tipo}** (${orden.objetivo}) ha sido aprobada.${respuesta ? ` Nota: ${respuesta}` : ""}`
      : `❌ Tu orden judicial de **${orden.tipo}** (${orden.objetivo}) ha sido rechazada.${respuesta ? ` Motivo: ${respuesta}` : ""}`,
  );

  revalidatePath("/dashboard/ordenes");
}

export async function marcarOrdenEjecutada(formData: FormData) {
  const solicitante = await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  const orden = await prisma.ordenJudicial.findUniqueOrThrow({ where: { id } });
  if (orden.solicitanteId !== solicitante.id) throw new Error("No autorizado");
  if (orden.estado !== "APROBADA") throw new Error("Solo se puede ejecutar una orden aprobada");

  await prisma.ordenJudicial.update({ where: { id }, data: { estado: "EJECUTADA" } });
  revalidatePath("/dashboard/ordenes");
}
