import type { PrismaClient } from "../generated/prisma/client";
import { resolverGuildId } from "./discord-roles";

type PrismaLike = Pick<InstanceType<typeof PrismaClient>, "canalLog">;

const API = "https://discord.com/api/v10";
const CATEGORIA_LOGS_ID = process.env.DISCORD_LOG_CATEGORY_ID ?? "1541387105098534962";

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

/** Publica una línea de auditoría en el canal de logs del tipo indicado. No falla la acción llamante si Discord no responde. */
export async function enviarLogDiscord(prisma: PrismaLike, tipo: TipoLog, mensaje: string) {
  if (!process.env.DISCORD_TOKEN) return;
  try {
    const channelId = await obtenerOCrearCanal(prisma, tipo);
    if (!channelId) return;
    const res = await fetch(`${API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ content: mensaje }),
    });
    if (!res.ok) console.error("[discord] No se pudo enviar el log:", await res.text());
  } catch (error) {
    console.error("[discord] Error enviando log:", error);
  }
}
