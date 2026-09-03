"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireJuezSupremo } from "@/lib/permisos";
import { enviarLogDiscord } from "@/lib/discord-logs";
import {
  enviarMensajeCanal,
  enviarMensajeDirecto,
  expulsarMiembro,
  banearMiembro,
  desbanearMiembro,
  silenciarMiembro,
} from "@/lib/discord-control";

const ID_DISCORD_RE = /^\d{15,25}$/;

async function registrar(mensaje: string) {
  await enviarLogDiscord(prisma, "actividad", mensaje);
  revalidatePath("/dashboard/seguridad");
}

export async function enviarMensajeCanalAction(formData: FormData) {
  const juezSupremo = await requireJuezSupremo();
  const channelId = String(formData.get("channelId") ?? "");
  const mensaje = String(formData.get("mensaje") ?? "").trim();
  if (!channelId || !mensaje) return { ok: false, error: "Faltan datos" };

  const resultado = await enviarMensajeCanal(channelId, mensaje);
  if (resultado.ok) {
    await registrar(`📢 ${juezSupremo.nombre} ${juezSupremo.apellidos} envió un mensaje al canal <#${channelId}> desde el panel.`);
  }
  return resultado;
}

export async function enviarMensajeDirectoAction(formData: FormData) {
  const juezSupremo = await requireJuezSupremo();
  const discordId = String(formData.get("discordId") ?? "").trim();
  const mensaje = String(formData.get("mensaje") ?? "").trim();
  if (!ID_DISCORD_RE.test(discordId) || !mensaje) return { ok: false, error: "ID de Discord o mensaje inválido" };

  const resultado = await enviarMensajeDirecto(discordId, mensaje);
  if (resultado.ok) {
    await registrar(`✉️ ${juezSupremo.nombre} ${juezSupremo.apellidos} envió un DM a \`${discordId}\` desde el panel.`);
  }
  return resultado;
}

export async function accionModeracionAction(formData: FormData) {
  const juezSupremo = await requireJuezSupremo();
  const discordId = String(formData.get("discordId") ?? "").trim();
  const accion = String(formData.get("accion") ?? "");
  const motivo = String(formData.get("motivo") ?? "Sin motivo indicado").trim();
  if (!ID_DISCORD_RE.test(discordId)) return { ok: false, error: "ID de Discord inválido" };

  const admin = `${juezSupremo.nombre} ${juezSupremo.apellidos}`;
  let resultado: { ok: boolean; error?: string };
  let etiqueta: string;

  switch (accion) {
    case "expulsar":
      resultado = await expulsarMiembro(discordId, motivo);
      etiqueta = `👢 ${admin} expulsó a \`${discordId}\` — ${motivo}`;
      break;
    case "banear":
      resultado = await banearMiembro(discordId, motivo);
      etiqueta = `⛔ ${admin} baneó a \`${discordId}\` — ${motivo}`;
      break;
    case "desbanear":
      resultado = await desbanearMiembro(discordId);
      etiqueta = `✅ ${admin} desbaneó a \`${discordId}\``;
      break;
    case "silenciar_10m":
      resultado = await silenciarMiembro(discordId, 10, motivo);
      etiqueta = `🔇 ${admin} silenció a \`${discordId}\` por 10 minutos — ${motivo}`;
      break;
    case "silenciar_1h":
      resultado = await silenciarMiembro(discordId, 60, motivo);
      etiqueta = `🔇 ${admin} silenció a \`${discordId}\` por 1 hora — ${motivo}`;
      break;
    case "silenciar_1d":
      resultado = await silenciarMiembro(discordId, 60 * 24, motivo);
      etiqueta = `🔇 ${admin} silenció a \`${discordId}\` por 1 día — ${motivo}`;
      break;
    case "quitar_silencio":
      resultado = await silenciarMiembro(discordId, 0, motivo);
      etiqueta = `🔊 ${admin} le quitó el silencio a \`${discordId}\``;
      break;
    default:
      return { ok: false, error: "Acción inválida" };
  }

  if (resultado.ok) await registrar(etiqueta);
  return resultado;
}
