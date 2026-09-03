"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { notificarDiscord } from "@/lib/discord-notify";
import { sincronizarMiembroDiscord } from "@/lib/discord-roles";
import { enviarLogDiscord } from "@/lib/discord-logs";
import { requireJuezSupremo } from "@/lib/permisos";

/** Da de alta a un miembro del staff del servidor de Discord (moderación) — no es personal del DOJ, sin nómina/contrato/fichaje. */
export async function crearStaff(formData: FormData) {
  const juezSupremo = await requireJuezSupremo();

  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellidos = String(formData.get("apellidos") ?? "").trim();
  const discordId = String(formData.get("discordId") ?? "").trim();

  if (!email || password.length < 6 || !nombre || !apellidos) {
    throw new Error("Datos incompletos o inválidos");
  }

  const staff = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      nombre,
      apellidos,
      role: "STAFF",
      discordId: discordId || null,
    },
  });

  await sincronizarMiembroDiscord(prisma, staff.discordId, "STAFF", `${nombre} ${apellidos}`);
  await notificarDiscord(
    staff.discordId,
    `🛡️ Has sido dado de alta como **Staff** del servidor.\nPortal: inicia sesión con tu correo.\nCorreo: ${email}`,
  );
  await enviarLogDiscord(
    prisma,
    "empleados",
    `🆕 **${nombre} ${apellidos}** dado de alta como **Staff** por ${juezSupremo.nombre} ${juezSupremo.apellidos}.`,
  );

  revalidatePath("/dashboard/staff");
}

export async function alternarActivoStaff(formData: FormData) {
  await requireJuezSupremo();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  const staff = await prisma.user.findUniqueOrThrow({ where: { id } });
  if (staff.role !== "STAFF") throw new Error("Solo se pueden gestionar cuentas de Staff");

  await prisma.user.update({ where: { id }, data: { activo: !staff.activo } });
  revalidatePath("/dashboard/staff");
}

/** Retira el acceso de staff: vuelve a ser un civil normal. */
export async function retirarAccesoStaff(formData: FormData) {
  const juezSupremo = await requireJuezSupremo();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  const usuario = await prisma.user.findUniqueOrThrow({ where: { id } });
  if (usuario.role !== "STAFF") throw new Error("Esta cuenta no es de Staff");

  await prisma.user.update({ where: { id }, data: { role: "CIVIL" } });
  await sincronizarMiembroDiscord(prisma, usuario.discordId, "CIVIL");
  await notificarDiscord(usuario.discordId, `⛔ Se te ha retirado el acceso de Staff. Tu cuenta vuelve a ser ciudadana.`);
  await enviarLogDiscord(
    prisma,
    "empleados",
    `⛔ Acceso de Staff retirado a **${usuario.nombre} ${usuario.apellidos}** por ${juezSupremo.nombre} ${juezSupremo.apellidos}.`,
  );

  revalidatePath("/dashboard/staff");
}
