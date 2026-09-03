"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { enviarLogDiscord } from "@/lib/discord-logs";
import { requirePermiso } from "@/lib/permisos";
import { auth } from "@/auth";

async function requirePublicarResoluciones() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  const { role } = session.user;
  if (role === "JUEZ_SUPREMO" || role === "JUEZ_DISTRITO") return session.user;
  return requirePermiso("RESOLVER_ORDENES");
}

export async function publicarResolucion(formData: FormData) {
  const autor = await requirePublicarResoluciones();

  const titulo = String(formData.get("titulo") ?? "").trim();
  const contenido = String(formData.get("contenido") ?? "").trim();
  const casoId = String(formData.get("casoId") ?? "").trim();
  if (!titulo || !contenido) throw new Error("Datos incompletos");

  await prisma.resolucion.create({
    data: { titulo, contenido, autorId: autor.id, casoId: casoId || null },
  });

  await enviarLogDiscord(
    prisma,
    "permisos",
    `⚖️ Nueva resolución publicada por **${autor.nombre} ${autor.apellidos}**: ${titulo}.`,
  );

  revalidatePath("/dashboard/resoluciones");
}
