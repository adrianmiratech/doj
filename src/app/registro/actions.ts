"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";

export type RegistroState = { error: string | null };

export async function registrarCiudadano(
  _prev: RegistroState,
  formData: FormData,
): Promise<RegistroState> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellidos = String(formData.get("apellidos") ?? "").trim();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");

  if (!nombre || !apellidos || !email) {
    return { error: "Completa todos los campos." };
  }
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const existente = await prisma.user.findFirst({ where: { email } });
  if (existente) {
    return { error: "Ya existe una cuenta con ese correo." };
  }

  await prisma.user.create({
    data: {
      nombre,
      apellidos,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "CIVIL",
    },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/portal" });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Cuenta creada, pero no se pudo iniciar sesión automáticamente. Inicia sesión manualmente." };
    }
    throw error;
  }
}
