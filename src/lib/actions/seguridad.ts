"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireJuezSupremo } from "@/lib/permisos";
import { reiniciarBot } from "@/lib/northflank";
import { enviarLogDiscord } from "@/lib/discord-logs";

export async function agregarAlertaWhitelist(formData: FormData) {
  await requireJuezSupremo();
  const tipo = String(formData.get("tipo") ?? "");
  let valor = String(formData.get("valor") ?? "").trim();
  const nota = String(formData.get("nota") ?? "").trim();
  if (!["email", "ip", "discord_id"].includes(tipo) || !valor) throw new Error("Datos incompletos o inválidos");

  if (tipo === "email") valor = valor.toLowerCase();

  await prisma.alertaWhitelist.upsert({
    where: { tipo_valor: { tipo, valor } },
    create: { tipo, valor, nota: nota || null },
    update: { nota: nota || null },
  });

  revalidatePath("/dashboard/seguridad");
}

export async function quitarAlertaWhitelist(formData: FormData) {
  await requireJuezSupremo();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  await prisma.alertaWhitelist.delete({ where: { id } });
  revalidatePath("/dashboard/seguridad");
}

export async function reiniciarBotAction() {
  const juezSupremo = await requireJuezSupremo();
  const resultado = await reiniciarBot();
  if (resultado.ok) {
    await enviarLogDiscord(
      prisma,
      "actividad",
      `🔁 El bot fue reiniciado manualmente desde el panel web por ${juezSupremo.nombre} ${juezSupremo.apellidos}.`,
    );
  }
  revalidatePath("/dashboard/seguridad");
  return resultado;
}
