"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireJuezSupremo() {
  const session = await auth();
  if (!session?.user || session.user.role !== "JUEZ_SUPREMO") {
    throw new Error("No autorizado");
  }
  return session.user;
}

export async function ajustarProgresoMedalla(formData: FormData) {
  await requireJuezSupremo();

  const medallaId = String(formData.get("medallaId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const progreso = Number(formData.get("progreso") ?? 0);
  if (!medallaId || !userId || Number.isNaN(progreso)) throw new Error("Datos incompletos");

  const medalla = await prisma.medalla.findUniqueOrThrow({ where: { id: medallaId } });
  const conseguida = progreso >= medalla.objetivo;

  await prisma.medallaProgreso.upsert({
    where: { medallaId_userId: { medallaId, userId } },
    update: { progreso, conseguida, fechaConseguida: conseguida ? new Date() : null },
    create: { medallaId, userId, progreso, conseguida, fechaConseguida: conseguida ? new Date() : null },
  });

  revalidatePath("/dashboard/condecoraciones");
}
