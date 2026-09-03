"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type CambiarPasswordState = { error: string | null; success: boolean };

export async function cambiarPassword(
  _prev: CambiarPasswordState,
  formData: FormData,
): Promise<CambiarPasswordState> {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const actual = String(formData.get("actual") ?? "");
  const nueva = String(formData.get("nueva") ?? "");

  if (nueva.length < 6) {
    return { error: "La nueva contraseña debe tener al menos 6 caracteres.", success: false };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "Usuario no encontrado.", success: false };

  const valid = await bcrypt.compare(actual, user.passwordHash);
  if (!valid) return { error: "La contraseña actual no es correcta.", success: false };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(nueva, 10) },
  });

  revalidatePath("/dashboard/perfil");
  revalidatePath("/portal/perfil");
  return { error: null, success: true };
}

export type CompletarPerfilState = { error: string | null };

/**
 * Cuenta creada con datos provisionales (ej. al verificarse por Discord):
 * en el primer inicio de sesión, antes de dejarle usar el portal, pide el
 * nombre real y una contraseña nueva para reemplazar la temporal.
 */
export async function completarPerfilInicial(
  _prev: CompletarPerfilState,
  formData: FormData,
): Promise<CompletarPerfilState> {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellidos = String(formData.get("apellidos") ?? "").trim();
  const nueva = String(formData.get("nueva") ?? "");
  const confirmar = String(formData.get("confirmar") ?? "");

  if (!nombre || !apellidos) return { error: "Escribe tu nombre y apellidos." };
  if (nueva.length < 6) return { error: "La nueva contraseña debe tener al menos 6 caracteres." };
  if (nueva !== confirmar) return { error: "Las contraseñas no coinciden." };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { nombre, apellidos, passwordHash: await bcrypt.hash(nueva, 10), perfilPendiente: false },
  });

  revalidatePath("/portal");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function alternarDisponibilidad() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  await prisma.user.update({
    where: { id: user.id },
    data: { disponibilidad: user.disponibilidad === "DISPONIBLE" ? "OCUPADO" : "DISPONIBLE" },
  });

  revalidatePath("/dashboard");
}
