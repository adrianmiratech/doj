"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/labels";

export async function crearInforme(formData: FormData) {
  const session = await auth();
  if (!session?.user || !STAFF_ROLES.includes(session.user.role as (typeof STAFF_ROLES)[number])) {
    throw new Error("No autorizado");
  }

  const titulo = String(formData.get("titulo") ?? "").trim();
  const contenido = String(formData.get("contenido") ?? "").trim();
  if (!titulo || !contenido) throw new Error("Datos incompletos");

  await prisma.informe.create({ data: { titulo, contenido, autorId: session.user.id } });

  revalidatePath("/dashboard/informes");
}
