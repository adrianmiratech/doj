"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notificarDiscord } from "@/lib/discord-notify";
import { sincronizarMiembroDiscord } from "@/lib/discord-roles";
import { enviarLogDiscord } from "@/lib/discord-logs";
import { requireJuezSupremo } from "@/lib/permisos";
import { ROLE_LABELS } from "@/lib/labels";

async function requireEncargadoSapd() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ENCARGADO_SAPD" && session.user.role !== "JUEZ_SUPREMO")) {
    throw new Error("No autorizado");
  }
  return session.user;
}

/** El Encargado SAPD da de alta a sus propios agentes, siempre con rango SAPD (no puede crear otros encargados). */
export async function crearAgenteSapd(formData: FormData) {
  const encargado = await requireEncargadoSapd();

  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellidos = String(formData.get("apellidos") ?? "").trim();
  const dni = String(formData.get("dni") ?? "").trim();
  const discordId = String(formData.get("discordId") ?? "").trim();

  if (!email || password.length < 6 || !nombre || !apellidos) {
    throw new Error("Datos incompletos o inválidos");
  }

  // El SAPD no lleva placa en nuestro sistema (es un departamento aparte, con su propia numeracion).
  const agente = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      nombre,
      apellidos,
      dni: dni || null,
      role: "SAPD",
      discordId: discordId || null,
    },
  });

  await sincronizarMiembroDiscord(agente.discordId, "SAPD", `${nombre} ${apellidos}`);
  await notificarDiscord(
    agente.discordId,
    `👮 Has sido dado de alta como **SAPD**.\nPortal: inicia sesión con tu correo.\nCorreo: ${email}`,
  );
  await enviarLogDiscord(
    prisma,
    "empleados",
    `🆕 **${nombre} ${apellidos}** dado de alta como **SAPD** por ${encargado.nombre} ${encargado.apellidos}.`,
  );

  revalidatePath("/dashboard/sapd");
}

export async function alternarActivoAgenteSapd(formData: FormData) {
  await requireEncargadoSapd();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  const agente = await prisma.user.findUniqueOrThrow({ where: { id } });
  if (agente.role !== "SAPD") throw new Error("Solo se pueden gestionar cuentas con rango SAPD");

  await prisma.user.update({ where: { id }, data: { activo: !agente.activo } });
  revalidatePath("/dashboard/sapd");
}

/** El Juez Supremo retira por completo el acceso SAPD (encargado o agente): vuelve a ser un civil normal. */
export async function retirarAccesoSapd(formData: FormData) {
  const juezSupremo = await requireJuezSupremo();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  const usuario = await prisma.user.findUniqueOrThrow({ where: { id } });
  if (usuario.role !== "ENCARGADO_SAPD" && usuario.role !== "SAPD") {
    throw new Error("Esta cuenta no tiene acceso SAPD");
  }

  await prisma.user.update({ where: { id }, data: { role: "CIVIL" } });
  await sincronizarMiembroDiscord(usuario.discordId, "CIVIL");
  await notificarDiscord(
    usuario.discordId,
    `⛔ Se te ha retirado el acceso al SAPD. Tu cuenta vuelve a ser ciudadana.`,
  );
  await enviarLogDiscord(
    prisma,
    "empleados",
    `⛔ Acceso SAPD retirado a **${usuario.nombre} ${usuario.apellidos}** (${ROLE_LABELS[usuario.role]}) por ${juezSupremo.nombre} ${juezSupremo.apellidos}.`,
  );

  revalidatePath("/dashboard/sapd");
}
