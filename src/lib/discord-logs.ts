import type { PrismaClient } from "../generated/prisma/client";
import { resolverGuildId } from "./discord-roles";

type PrismaLike = Pick<InstanceType<typeof PrismaClient>, "canalLog" | "alertaWhitelist">;

const API = "https://discord.com/api/v10";
const CATEGORIA_LOGS_ID = process.env.DISCORD_LOG_CATEGORY_ID ?? "1541387105098534962";
const COLOR_DOJ = 0xc9a227;

function headers() {
  return {
    Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
    "Content-Type": "application/json",
  };
}

export const TIPOS_LOG = [
  "empleados",
  "nominas",
  "faltas",
  "postulaciones",
  "permisos",
  "fichajes",
  "tramites",
  "actividad",
  "accesos",
] as const;
export type TipoLog = (typeof TIPOS_LOG)[number];

const NOMBRES_CANAL: Record<TipoLog, string> = {
  empleados: "logs-empleados",
  nominas: "logs-nominas",
  faltas: "logs-faltas",
  postulaciones: "logs-postulaciones",
  permisos: "logs-permisos",
  fichajes: "logs-fichajes",
  tramites: "logs-tramites",
  actividad: "logs-actividad",
  accesos: "logs-accesos",
};

async function obtenerOCrearCanal(prisma: PrismaLike, tipo: TipoLog): Promise<string | null> {
  const existente = await prisma.canalLog.findUnique({ where: { tipo } });
  if (existente) return existente.channelId;
  if (!process.env.DISCORD_TOKEN) return null;

  const guildId = await resolverGuildId();
  if (!guildId) return null;

  try {
    const res = await fetch(`${API}/guilds/${guildId}/channels`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ name: NOMBRES_CANAL[tipo], type: 0, parent_id: CATEGORIA_LOGS_ID }),
    });
    if (!res.ok) {
      console.error(`[discord] No se pudo crear el canal de log "${tipo}":`, await res.text());
      return null;
    }
    const canal = (await res.json()) as { id: string };
    await prisma.canalLog.create({ data: { tipo, channelId: canal.id } });
    console.log(`[discord] Canal de log creado: #${NOMBRES_CANAL[tipo]}`);
    return canal.id;
  } catch (error) {
    console.error(`[discord] Error creando el canal de log "${tipo}":`, error);
    return null;
  }
}

/** Crea (si faltan) los canales de log de cada tipo bajo la categoría configurada. Segura de llamar varias veces. */
export async function asegurarCanalesLogDiscord(prisma: PrismaLike) {
  for (const tipo of TIPOS_LOG) {
    await obtenerOCrearCanal(prisma, tipo);
  }
}

/** Publica una línea de auditoría (como embed) en el canal de logs del tipo indicado. No falla la acción llamante si Discord no responde. */
export async function enviarLogDiscord(prisma: PrismaLike, tipo: TipoLog, mensaje: string) {
  if (!process.env.DISCORD_TOKEN) return;
  try {
    const channelId = await obtenerOCrearCanal(prisma, tipo);
    if (!channelId) return;
    const res = await fetch(`${API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        embeds: [{ description: mensaje, color: COLOR_DOJ, timestamp: new Date().toISOString() }],
      }),
    });
    if (!res.ok) console.error("[discord] No se pudo enviar el log:", await res.text());
  } catch (error) {
    console.error("[discord] Error enviando log:", error);
  }
}

export type LineaHistorial = { descripcion: string; timestamp: string };

/** Últimos mensajes publicados en un canal de log (para mostrarlos en el panel web, sin tener que abrir Discord). */
export async function obtenerMensajesLog(prisma: PrismaLike, tipo: TipoLog, limite = 30): Promise<LineaHistorial[]> {
  if (!process.env.DISCORD_TOKEN) return [];
  try {
    const canalId = await obtenerOCrearCanal(prisma, tipo);
    if (!canalId) return [];
    const res = await fetch(`${API}/channels/${canalId}/messages?limit=${limite}`, { headers: headers() });
    if (!res.ok) return [];
    const mensajes = (await res.json()) as { embeds: { description?: string }[]; content: string; timestamp: string }[];
    return mensajes.map((m) => ({ descripcion: m.embeds[0]?.description ?? m.content, timestamp: m.timestamp }));
  } catch (error) {
    console.error("[discord] Error obteniendo mensajes de log:", error);
    return [];
  }
}

/** Contexto de quién/qué disparó una alerta, para poder eximirla si está en la whitelist de pruebas. */
type ContextoAlerta = { email?: string | null; ip?: string | null; discordId?: string | null };

/** Si el email, IP o ID de Discord del contexto está en la whitelist de pruebas (AlertaWhitelist). */
export async function alertaExenta(prisma: PrismaLike, contexto: ContextoAlerta): Promise<boolean> {
  const pares: [string, string][] = [];
  if (contexto.email) pares.push(["email", contexto.email.toLowerCase()]);
  if (contexto.ip) pares.push(["ip", contexto.ip]);
  if (contexto.discordId) pares.push(["discord_id", contexto.discordId]);
  if (pares.length === 0) return false;

  for (const [tipo, valor] of pares) {
    const fila = await prisma.alertaWhitelist.findUnique({ where: { tipo_valor: { tipo, valor } } });
    if (fila) return true;
  }
  return false;
}

/**
 * Avisa por mensaje privado (embed) al owner del servidor de Discord (vía
 * REST, sin necesitar el proceso del bot conectado por gateway). Reservado
 * para alertas altamente urgentes (fuerza bruta, raid, nuke...); si el
 * contexto (email/IP/ID de Discord) está en la whitelist de pruebas, no
 * envía nada — así las pruebas del propio equipo no generan falsas alarmas.
 */
export async function avisarOwnerDiscord(prisma: PrismaLike, mensaje: string, contexto?: ContextoAlerta) {
  if (!process.env.DISCORD_TOKEN) return;
  try {
    if (contexto && (await alertaExenta(prisma, contexto))) {
      console.log("[discord] Alerta al owner omitida (contexto en whitelist de pruebas).");
      return;
    }

    const guildId = await resolverGuildId();
    if (!guildId) return;

    const guildRes = await fetch(`${API}/guilds/${guildId}`, { headers: headers() });
    if (!guildRes.ok) return;
    const guild = (await guildRes.json()) as { owner_id: string };

    const dmRes = await fetch(`${API}/users/@me/channels`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ recipient_id: guild.owner_id }),
    });
    if (!dmRes.ok) return;
    const dm = (await dmRes.json()) as { id: string };

    const msgRes = await fetch(`${API}/channels/${dm.id}/messages`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        embeds: [
          {
            title: "🚨 Alerta de seguridad urgente",
            description: mensaje,
            color: 0xdc3545,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
    if (!msgRes.ok) console.error("[discord] No se pudo avisar al owner por DM:", await msgRes.text());
  } catch (error) {
    console.error("[discord] Error avisando al owner por DM:", error);
  }
}
