"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cerrarSemanaYGenerarNuevas } from "@/lib/nominas-auto";
import { notificarDiscord } from "@/lib/discord-notify";
import { enviarLogDiscord } from "@/lib/discord-logs";
import { requirePermiso } from "@/lib/permisos";

export async function marcarNominaPagada(formData: FormData) {
  await requirePermiso("GESTIONAR_NOMINAS");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  const nomina = await prisma.nomina.update({
    where: { id },
    data: { pagada: true },
    include: { user: true },
  });

  await notificarDiscord(
    nomina.user.discordId,
    `💵 Se ha marcado como pagada tu nómina de **${nomina.periodo}** ($${nomina.importe.toLocaleString("es-ES")}).`,
  );
  await enviarLogDiscord(
    prisma,
    "nominas",
    `💵 Nómina pagada: **${nomina.user.nombre} ${nomina.user.apellidos}** · ${nomina.periodo} · $${nomina.importe.toLocaleString("es-ES")}.`,
  );

  revalidatePath("/dashboard/nominas");
}

export async function reconocerNomina(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  const nomina = await prisma.nomina.findUnique({ where: { id } });
  if (!nomina || nomina.userId !== session.user.id) throw new Error("No autorizado");

  await prisma.nomina.update({ where: { id }, data: { acordada: true } });

  revalidatePath("/dashboard/nominas");
}

export async function ejecutarCierreSemanal() {
  await requirePermiso("GESTIONAR_NOMINAS");
  await cerrarSemanaYGenerarNuevas(prisma);
  revalidatePath("/dashboard/nominas");
}
