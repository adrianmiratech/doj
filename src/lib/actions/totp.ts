"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import { requireJuezSupremo } from "@/lib/permisos";
import { generarSecretoTotp, verificarCodigoTotp } from "@/lib/totp";
import { enviarLogDiscord } from "@/lib/discord-logs";
import { ROLE_LABELS } from "@/lib/labels";

/** Genera (si no existe ya uno pendiente de confirmar) un secreto TOTP para el usuario actual. */
export async function iniciarConfiguracion2FA() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.totpHabilitado && !user.totpSecret) {
    await prisma.user.update({ where: { id: user.id }, data: { totpSecret: generarSecretoTotp() } });
  }

  revalidatePath("/dashboard/perfil");
  revalidatePath("/portal/perfil");
}

export type Totp2FAState = { error: string | null };

/** Confirma el código introducido y activa la verificación en dos pasos. */
export async function confirmar2FA(_prev: Totp2FAState, formData: FormData): Promise<Totp2FAState> {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const codigo = String(formData.get("codigo") ?? "").trim();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.totpSecret) return { error: "No hay una configuración pendiente. Recargá la página." };

  if (!(await verificarCodigoTotp(user.totpSecret, codigo))) {
    return { error: "Código incorrecto. Probá de nuevo." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { totpHabilitado: true } });
  await enviarLogDiscord(
    prisma,
    "accesos",
    `🔐 **${user.nombre} ${user.apellidos}** activó la verificación en dos pasos.`,
  );

  revalidatePath("/dashboard/perfil");
  revalidatePath("/portal/perfil");
  return { error: null };
}

/** Desactiva la verificación en dos pasos; exige un código válido para evitar que alguien con la sesión abierta la apague sin más. */
export async function desactivar2FA(_prev: Totp2FAState, formData: FormData): Promise<Totp2FAState> {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const codigo = String(formData.get("codigo") ?? "").trim();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.totpHabilitado || !user.totpSecret) return { error: null };

  if (!(await verificarCodigoTotp(user.totpSecret, codigo))) {
    return { error: "Código incorrecto." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { totpHabilitado: false, totpSecret: null } });
  await enviarLogDiscord(
    prisma,
    "accesos",
    `🔓 **${user.nombre} ${user.apellidos}** desactivó la verificación en dos pasos.`,
  );

  revalidatePath("/dashboard/perfil");
  revalidatePath("/portal/perfil");
  return { error: null };
}

/** Juez Supremo: marca (o desmarca) un rango como obligado a usar verificación en dos pasos. */
export async function alternarTotpObligatorioRol(formData: FormData) {
  const juezSupremo = await requireJuezSupremo();

  const role = String(formData.get("role") ?? "") as Role;
  if (!role) throw new Error("Rango inválido");

  const existente = await prisma.rolTotp.findUnique({ where: { role } });
  const nuevoValor = !(existente?.obligatorio ?? false);

  await prisma.rolTotp.upsert({
    where: { role },
    create: { role, obligatorio: nuevoValor },
    update: { obligatorio: nuevoValor },
  });

  await enviarLogDiscord(
    prisma,
    "accesos",
    `🔐 ${juezSupremo.nombre} ${juezSupremo.apellidos} ${nuevoValor ? "hizo obligatoria" : "quitó la obligatoriedad de"} la verificación en dos pasos para **${ROLE_LABELS[role]}**.`,
  );

  revalidatePath("/dashboard/permisos");
}
