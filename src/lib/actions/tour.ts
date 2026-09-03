"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Marca la guía de bienvenida como vista: no vuelve a mostrarse. */
export async function completarTour() {
  const session = await auth();
  if (!session?.user) return;
  await prisma.user.update({ where: { id: session.user.id }, data: { tourCompletado: true } });
  revalidatePath("/dashboard");
}
