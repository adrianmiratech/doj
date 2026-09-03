"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { notificarDiscord } from "@/lib/discord-notify";
import { sincronizarMiembroDiscord, otorgarRolServidorPorClave, retirarRolServidorPorClave } from "@/lib/discord-roles";
import { enviarLogDiscord } from "@/lib/discord-logs";
import { requireJuezSupremo } from "@/lib/permisos";

/**
 * Da de alta el acceso de Staff del servidor de Discord (moderación). Es
 * independiente del rango de trabajo: si ya existe una cuenta con ese ID de
 * Discord, solo se le añade la marca de Staff (conserva su rango); si no
 * existe, se crea como Ciudadano + Staff.
 */
export async function crearStaff(formData: FormData) {
  const juezSupremo = await requireJuezSupremo();

  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellidos = String(formData.get("apellidos") ?? "").trim();
  const discordId = String(formData.get("discordId") ?? "").trim() || null;

  if (discordId) {
    const existente = await prisma.user.findFirst({ where: { discordId } });
    if (existente) {
      if (existente.esStaffServidor) throw new Error("Esa cuenta ya tiene el acceso de Staff.");
      await prisma.user.update({ where: { id: existente.id }, data: { esStaffServidor: true } });
      await otorgarRolServidorPorClave(prisma, existente.discordId, "STAFF");
      await notificarDiscord(
        existente.discordId,
        `🛡️ Se te ha dado el acceso de **Staff** del servidor (además de tu rango actual).`,
      );
      await enviarLogDiscord(
        prisma,
        "empleados",
        `🛡️ **${existente.nombre} ${existente.apellidos}** obtuvo el acceso de **Staff** por ${juezSupremo.nombre} ${juezSupremo.apellidos}.`,
      );
      revalidatePath("/dashboard/staff");
      return;
    }
  }

  if (!email || password.length < 6 || !nombre || !apellidos) {
    throw new Error("Datos incompletos o inválidos");
  }

  const staff = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      nombre,
      apellidos,
      role: "CIVIL",
      esStaffServidor: true,
      discordId,
    },
  });

  await sincronizarMiembroDiscord(prisma, staff.discordId, "CIVIL", `${nombre} ${apellidos}`);
  await otorgarRolServidorPorClave(prisma, staff.discordId, "STAFF");
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
  if (!staff.esStaffServidor) throw new Error("Solo se pueden gestionar cuentas de Staff");

  await prisma.user.update({ where: { id }, data: { activo: !staff.activo } });
  revalidatePath("/dashboard/staff");
}

/** Retira el acceso de Staff sin tocar el rango de trabajo de la cuenta (son independientes). */
export async function retirarAccesoStaff(formData: FormData) {
  const juezSupremo = await requireJuezSupremo();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  const usuario = await prisma.user.findUniqueOrThrow({ where: { id } });
  if (!usuario.esStaffServidor) throw new Error("Esta cuenta no tiene acceso de Staff");

  await prisma.user.update({ where: { id }, data: { esStaffServidor: false } });
  await retirarRolServidorPorClave(prisma, usuario.discordId, "STAFF");
  await notificarDiscord(usuario.discordId, `⛔ Se te ha retirado el acceso de Staff.`);
  await enviarLogDiscord(
    prisma,
    "empleados",
    `⛔ Acceso de Staff retirado a **${usuario.nombre} ${usuario.apellidos}** por ${juezSupremo.nombre} ${juezSupremo.apellidos}.`,
  );

  revalidatePath("/dashboard/staff");
}
