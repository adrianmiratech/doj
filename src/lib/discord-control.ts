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

export type MiembroBuscado = { id: string; tag: string; nick: string | null; avatarUrl: string | null };

/** Busca miembros del servidor por nombre/usuario, para no tener que escribir el ID a mano. */
export async function buscarMiembros(query: string): Promise<MiembroBuscado[]> {
  if (!process.env.DISCORD_TOKEN || !query.trim()) return [];
  const guildId = await resolverGuildId();
  if (!guildId) return [];

  try {
    const params = new URLSearchParams({ query: query.trim(), limit: "10" });
    const res = await fetch(`${API}/guilds/${guildId}/members/search?${params}`, { headers: headers() });
    if (!res.ok) return [];
    const miembros = (await res.json()) as {
      user: { id: string; username: string; discriminator: string; avatar: string | null };
      nick: string | null;
    }[];
    return miembros.map((m) => ({
      id: m.user.id,
      tag: m.user.discriminator === "0" ? m.user.username : `${m.user.username}#${m.user.discriminator}`,
      nick: m.nick,
      avatarUrl: m.user.avatar ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png?size=64` : null,
    }));
  } catch (error) {
    console.error("[discord] Error buscando miembros:", error);
    return [];
  }
}

export type Baneado = { id: string; tag: string; motivo: string | null };

/** Lista los usuarios baneados del servidor. */
export async function listarBaneados(): Promise<Baneado[]> {
  if (!process.env.DISCORD_TOKEN) return [];
  const guildId = await resolverGuildId();
  if (!guildId) return [];

  try {
    const res = await fetch(`${API}/guilds/${guildId}/bans?limit=100`, { headers: headers() });
    if (!res.ok) return [];
    const bans = (await res.json()) as { user: { id: string; username: string }; reason: string | null }[];
    return bans.map((b) => ({ id: b.user.id, tag: b.user.username, motivo: b.reason }));
  } catch (error) {
    console.error("[discord] Error listando baneados:", error);
    return [];
  }
}

/** Borra en bloque los últimos `cantidad` mensajes de un canal (máx. 100; Discord no permite borrar mensajes de más de 14 días). */
export async function purgarMensajes(channelId: string, cantidad: number): Promise<Resultado & { borrados?: number }> {
  if (!process.env.DISCORD_TOKEN) return { ok: false, error: "Falta configurar DISCORD_TOKEN" };
  try {
    const listaRes = await fetch(`${API}/channels/${channelId}/messages?limit=${Math.min(cantidad, 100)}`, {
      headers: headers(),
    });
    if (!listaRes.ok) return { ok: false, error: await listaRes.text() };
    const mensajes = (await listaRes.json()) as { id: string }[];
    if (mensajes.length === 0) return { ok: true, borrados: 0 };

    if (mensajes.length === 1) {
      const res = await fetch(`${API}/channels/${channelId}/messages/${mensajes[0].id}`, {
        method: "DELETE",
        headers: headers(),
      });
      if (!res.ok && res.status !== 204) return { ok: false, error: await res.text() };
      return { ok: true, borrados: 1 };
    }

    const res = await fetch(`${API}/channels/${channelId}/messages/bulk-delete`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ messages: mensajes.map((m) => m.id) }),
    });
    if (!res.ok && res.status !== 204) {
      const texto = await res.text();
      if (texto.includes("14 days")) {
        return { ok: false, error: "No se pueden borrar en bloque mensajes de más de 14 días; hazlo manualmente." };
      }
      return { ok: false, error: texto };
    }
    return { ok: true, borrados: mensajes.length };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

const PERMISO_ENVIAR_MENSAJES = BigInt(1 << 11); // SEND_MESSAGES (0x800)

/** Bloquea o desbloquea un canal para @everyone (para responder a un raid o discusión que se fue de control). */
export async function bloquearCanal(channelId: string, bloquear: boolean): Promise<Resultado> {
  if (!process.env.DISCORD_TOKEN) return { ok: false, error: "Falta configurar DISCORD_TOKEN" };
  const guildId = await resolverGuildId();
  if (!guildId) return { ok: false, error: "No se pudo resolver el servidor de Discord" };

  try {
    const chRes = await fetch(`${API}/channels/${channelId}`, { headers: headers() });
    if (!chRes.ok) return { ok: false, error: await chRes.text() };
    const canal = (await chRes.json()) as { permission_overwrites: { id: string; allow: string; deny: string }[] };
    const actual = canal.permission_overwrites.find((o) => o.id === guildId);

    let allow = BigInt(actual?.allow ?? "0");
    let deny = BigInt(actual?.deny ?? "0");
    if (bloquear) {
      deny |= PERMISO_ENVIAR_MENSAJES;
      allow &= ~PERMISO_ENVIAR_MENSAJES;
    } else {
      deny &= ~PERMISO_ENVIAR_MENSAJES;
    }

    const res = await fetch(`${API}/channels/${channelId}/permissions/${guildId}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({ allow: allow.toString(), deny: deny.toString(), type: 0 }),
    });
    if (!res.ok && res.status !== 204) return { ok: false, error: await res.text() };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

/** Cambia el modo lento (segundos entre mensajes por usuario, 0-21600) de un canal. */
export async function cambiarSlowmode(channelId: string, segundos: number): Promise<Resultado> {
  if (!process.env.DISCORD_TOKEN) return { ok: false, error: "Falta configurar DISCORD_TOKEN" };
  try {
    const res = await fetch(`${API}/channels/${channelId}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ rate_limit_per_user: Math.max(0, Math.min(21600, segundos)) }),
    });
    if (!res.ok) return { ok: false, error: await res.text() };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

export type EstadisticasServidor = {
  miembros: number;
  canales: number;
  roles: number;
  boosts: number;
  nivelBoost: number;
};

/** Estadísticas generales del servidor (miembros, canales, roles, boosts). */
export async function obtenerEstadisticasServidor(): Promise<EstadisticasServidor | null> {
  if (!process.env.DISCORD_TOKEN) return null;
  const guildId = await resolverGuildId();
  if (!guildId) return null;

  try {
    const [guildRes, canalesRes] = await Promise.all([
      fetch(`${API}/guilds/${guildId}?with_counts=true`, { headers: headers() }),
      fetch(`${API}/guilds/${guildId}/channels`, { headers: headers() }),
    ]);
    if (!guildRes.ok || !canalesRes.ok) return null;

    const guild = (await guildRes.json()) as {
      approximate_member_count: number;
      roles: unknown[];
      premium_subscription_count: number;
      premium_tier: number;
    };
    const canales = (await canalesRes.json()) as unknown[];

    return {
      miembros: guild.approximate_member_count,
      canales: canales.length,
      roles: guild.roles.length,
      boosts: guild.premium_subscription_count,
      nivelBoost: guild.premium_tier,
    };
  } catch (error) {
    console.error("[discord] Error obteniendo estadísticas del servidor:", error);
    return null;
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
