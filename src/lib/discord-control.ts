import { resolverGuildId } from "./discord-roles";

const API = "https://discord.com/api/v10";
const COLOR_DOJ = 0xc9a227;
const FOOTER = { text: "Alfonso Miler · Secretario del Departamento" };

function headers() {
  return {
    Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
    "Content-Type": "application/json",
  };
}

type Resultado = { ok: boolean; error?: string };

async function abrirDM(discordId: string): Promise<string | null> {
  const res = await fetch(`${API}/users/@me/channels`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ recipient_id: discordId }),
  });
  if (!res.ok) return null;
  return ((await res.json()) as { id: string }).id;
}

export type CanalTexto = { id: string; name: string };

/** Canales de texto (y de anuncios) del servidor, para elegir a dónde enviar un mensaje desde el panel. */
export async function listarCanalesTexto(): Promise<CanalTexto[]> {
  if (!process.env.DISCORD_TOKEN) return [];
  const guildId = await resolverGuildId();
  if (!guildId) return [];

  try {
    const res = await fetch(`${API}/guilds/${guildId}/channels`, { headers: headers() });
    if (!res.ok) return [];
    const canales = (await res.json()) as { id: string; name: string; type: number; position: number }[];
    return canales
      .filter((c) => c.type === 0 || c.type === 5)
      .sort((a, b) => a.position - b.position)
      .map((c) => ({ id: c.id, name: c.name }));
  } catch (error) {
    console.error("[discord] Error listando canales:", error);
    return [];
  }
}

/** Envía un mensaje (como embed) a un canal del servidor en nombre del bot. */
export async function enviarMensajeCanal(channelId: string, mensaje: string): Promise<Resultado> {
  if (!process.env.DISCORD_TOKEN) return { ok: false, error: "Falta configurar DISCORD_TOKEN" };
  try {
    const res = await fetch(`${API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        embeds: [{ description: mensaje, color: COLOR_DOJ, footer: FOOTER, timestamp: new Date().toISOString() }],
      }),
    });
    if (!res.ok) return { ok: false, error: await res.text() };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

/** Envía un mensaje directo libre (no ligado a una plantilla del sistema) a un usuario por su ID de Discord. */
export async function enviarMensajeDirecto(discordId: string, mensaje: string): Promise<Resultado> {
  if (!process.env.DISCORD_TOKEN) return { ok: false, error: "Falta configurar DISCORD_TOKEN" };
  try {
    const canalId = await abrirDM(discordId);
    if (!canalId) return { ok: false, error: "No se pudo abrir el DM (¿el usuario no comparte servidor con el bot o tiene los DMs cerrados?)" };

    const res = await fetch(`${API}/channels/${canalId}/messages`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        embeds: [{ description: mensaje, color: COLOR_DOJ, footer: FOOTER, timestamp: new Date().toISOString() }],
      }),
    });
    if (!res.ok) return { ok: false, error: await res.text() };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

/** Expulsa (kick) a un miembro del servidor. */
export async function expulsarMiembro(discordId: string, motivo: string): Promise<Resultado> {
  if (!process.env.DISCORD_TOKEN) return { ok: false, error: "Falta configurar DISCORD_TOKEN" };
  const guildId = await resolverGuildId();
  if (!guildId) return { ok: false, error: "No se pudo resolver el servidor de Discord" };

  try {
    const res = await fetch(`${API}/guilds/${guildId}/members/${discordId}`, {
      method: "DELETE",
      headers: { ...headers(), "X-Audit-Log-Reason": encodeURIComponent(motivo.slice(0, 500)) },
    });
    if (!res.ok && res.status !== 204) return { ok: false, error: await res.text() };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

/** Banea a un miembro (o a un ID que ya no esté en el servidor). */
export async function banearMiembro(discordId: string, motivo: string): Promise<Resultado> {
  if (!process.env.DISCORD_TOKEN) return { ok: false, error: "Falta configurar DISCORD_TOKEN" };
  const guildId = await resolverGuildId();
  if (!guildId) return { ok: false, error: "No se pudo resolver el servidor de Discord" };

  try {
    const res = await fetch(`${API}/guilds/${guildId}/bans/${discordId}`, {
      method: "PUT",
      headers: { ...headers(), "X-Audit-Log-Reason": encodeURIComponent(motivo.slice(0, 500)) },
      body: JSON.stringify({}),
    });
    if (!res.ok && res.status !== 204) return { ok: false, error: await res.text() };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

/** Quita el baneo de un ID de Discord. */
export async function desbanearMiembro(discordId: string): Promise<Resultado> {
  if (!process.env.DISCORD_TOKEN) return { ok: false, error: "Falta configurar DISCORD_TOKEN" };
  const guildId = await resolverGuildId();
  if (!guildId) return { ok: false, error: "No se pudo resolver el servidor de Discord" };

  try {
    const res = await fetch(`${API}/guilds/${guildId}/bans/${discordId}`, {
      method: "DELETE",
      headers: headers(),
    });
    if (!res.ok && res.status !== 204) return { ok: false, error: await res.text() };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

/** Silencia (timeout) a un miembro durante los minutos indicados. Pasar minutos=0 para quitarle el silencio. */
export async function silenciarMiembro(discordId: string, minutos: number, motivo: string): Promise<Resultado> {
  if (!process.env.DISCORD_TOKEN) return { ok: false, error: "Falta configurar DISCORD_TOKEN" };
  const guildId = await resolverGuildId();
  if (!guildId) return { ok: false, error: "No se pudo resolver el servidor de Discord" };

  const communication_disabled_until = minutos > 0 ? new Date(Date.now() + minutos * 60_000).toISOString() : null;

  try {
    const res = await fetch(`${API}/guilds/${guildId}/members/${discordId}`, {
      method: "PATCH",
      headers: { ...headers(), "X-Audit-Log-Reason": encodeURIComponent(motivo.slice(0, 500)) },
      body: JSON.stringify({ communication_disabled_until }),
    });
    if (!res.ok) return { ok: false, error: await res.text() };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}
