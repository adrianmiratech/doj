"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function listarMisNotificaciones() {
  const session = await auth();
  if (!session?.user) return [];

  return prisma.notificacion.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
}

export async function contarNotificacionesNoLeidas() {
  const session = await auth();
  if (!session?.user) return 0;

  return prisma.notificacion.count({ where: { userId: session.user.id, leida: false } });
}

export async function marcarNotificacionLeida(id: string) {
  const session = await auth();
  if (!session?.user) return;

  const notificacion = await prisma.notificacion.findUnique({ where: { id } });
  if (!notificacion || notificacion.userId !== session.user.id) return;

  await prisma.notificacion.update({ where: { id }, data: { leida: true } });
  revalidatePath("/dashboard");
  revalidatePath("/portal");
}

export async function marcarTodasLeidas() {
  const session = await auth();
  if (!session?.user) return;

  await prisma.notificacion.updateMany({
    where: { userId: session.user.id, leida: false },
    data: { leida: true },
  });
  revalidatePath("/dashboard");
  revalidatePath("/portal");
}
