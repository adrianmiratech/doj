"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function actualizarDiscordId(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const discordId = String(formData.get("discordId") ?? "").trim();
  if (discordId && !/^\d{15,25}$/.test(discordId)) {
    throw new Error("ID de Discord inválido");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { discordId: discordId || null },
  });

  revalidatePath("/dashboard/perfil");
  revalidatePath("/portal/perfil");
}
