"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function enviarFeedback(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const tipo = String(formData.get("tipo") ?? "Sugerencia");
  const contenido = String(formData.get("contenido") ?? "").trim();
  const anonimo = formData.get("anonimo") === "on";
  if (!contenido) throw new Error("Datos incompletos");

  await prisma.feedback.create({
    data: {
      tipo,
      contenido,
      anonimo,
      autorId: anonimo ? null : session.user.id,
    },
  });

  revalidatePath("/dashboard/feedback");
}
