"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function entrarServicio(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const abierto = await prisma.fichaje.findFirst({
    where: { userId: session.user.id, salida: null },
  });
  if (abierto) return;

  const actividad = String(formData.get("actividad") ?? "Atención al público");
  await prisma.fichaje.create({ data: { userId: session.user.id, actividad } });

  revalidatePath("/dashboard/fichaje");
}

export async function salirServicio() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const abierto = await prisma.fichaje.findFirst({
    where: { userId: session.user.id, salida: null },
  });
  if (!abierto) return;

  await prisma.fichaje.update({ where: { id: abierto.id }, data: { salida: new Date() } });

  revalidatePath("/dashboard/fichaje");
}
