import { ROLE_LABELS } from "./labels";

const API = "https://discord.com/api/v10";

// Rol adicional de grupo "Fiscales" que se concede (ademas del rol de rango)
// a quien sea Fiscal General.
const ROL_FISCALES_ID = "1541395898368659526";

// Rol "STAFF OLD RP": distintivo general para cualquier miembro del personal
// (Justicia o SAPD), independientemente de su rango concreto. Ya existe en
// Discord (no lo crea el bot); solo se concede o se retira segun corresponda.
const ROL_STAFF_ID = "1541444543252267178";

function headers() {
  return {
    Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
    "Content-Type": "application/json",
  };
}

export async function resolverGuildId(): Promise<string | null> {
  if (process.env.DISCORD_GUILD_ID) return process.env.DISCORD_GUILD_ID;
  const token = process.env.DISCORD_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`${API}/users/@me/guilds`, { headers: headers() });
    if (!res.ok) return null;
    const guilds = (await res.json()) as { id: string }[];
    if (guilds.length === 1) return guilds[0].id;
    if (guilds.length > 1) {
      console.error(
        "El bot está en varios servidores de Discord; define DISCORD_GUILD_ID en .env para saber cuál gestionar.",
      );
    }
    return null;
  } catch (error) {
    console.error("No se pudo resolver el servidor de Discord:", error);
    return null;
  }
}

async function obtenerRolesGuild(guildId: string): Promise<{ id: string; name: string }[]> {
  try {
    const res = await fetch(`${API}/guilds/${guildId}/roles`, { headers: headers() });
    if (!res.ok) return [];
    return (await res.json()) as { id: string; name: string }[];
  } catch {
    return [];
  }
}

/** Crea en Discord (si faltan) un rol por cada rango del sistema, incluyendo Civil. Segura de llamar varias veces. */
export async function asegurarRolesDiscord() {
  const guildId = await resolverGuildId();
  if (!guildId) return;

  const existentes = await obtenerRolesGuild(guildId);
  for (const nombre of Object.values(ROLE_LABELS)) {
    if (existentes.some((r) => r.name === nombre)) continue;
    try {
      const res = await fetch(`${API}/guilds/${guildId}/roles`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ name: nombre, mentionable: true }),
      });
      if (res.ok) console.log(`[discord] Rol creado: ${nombre}`);
      else console.error(`[discord] No se pudo crear el rol "${nombre}":`, await res.text());
    } catch (error) {
      console.error(`[discord] Error creando el rol "${nombre}":`, error);
    }
  }
}

/**
 * Sincroniza el rango de un miembro en Discord: le retira cualquier rol de
 * rango del sistema que tuviera y le asigna el correspondiente a `roleKey`.
 * Si se indica `nick`, también actualiza su apodo (p. ej. "Nombre - #1001").
 * No falla la operación llamante si Discord no responde: solo registra el error.
 */
export async function sincronizarMiembroDiscord(
  discordId: string | null | undefined,
  roleKey: string,
  nick?: string | null,
) {
  if (!discordId) return;
  if (!process.env.DISCORD_TOKEN) return;

  const guildId = await resolverGuildId();
  if (!guildId) return;

  try {
    const memberRes = await fetch(`${API}/guilds/${guildId}/members/${discordId}`, { headers: headers() });
    if (!memberRes.ok) return;
    const member = (await memberRes.json()) as { roles: string[] };

    const rolesGuild = await obtenerRolesGuild(guildId);
    const idsDeRangos = new Set(
      rolesGuild.filter((r) => Object.values(ROLE_LABELS).includes(r.name)).map((r) => r.id),
    );
    const idNuevoRol = rolesGuild.find((r) => r.name === ROLE_LABELS[roleKey])?.id;

    const rolesFinales = member.roles.filter((id) => !idsDeRangos.has(id));
    if (idNuevoRol) rolesFinales.push(idNuevoRol);

    const body: Record<string, unknown> = { roles: rolesFinales };
    if (nick !== undefined && nick !== null) body.nick = nick.slice(0, 32);

    const patchRes = await fetch(`${API}/guilds/${guildId}/members/${discordId}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify(body),
    });
    if (!patchRes.ok) console.error("[discord] No se pudo sincronizar rol/apodo:", await patchRes.text());

    if (roleKey === "FISCAL_GENERAL") {
      await otorgarRolPorId(discordId, ROL_FISCALES_ID);
    }

    // STAFF OLD RP: cualquier rango que no sea Civil lo lleva; al volver a Civil se retira.
    if (roleKey === "CIVIL") {
      await retirarRolPorId(discordId, ROL_STAFF_ID);
    } else {
      await otorgarRolPorId(discordId, ROL_STAFF_ID);
    }
  } catch (error) {
    console.error("[discord] Error sincronizando miembro:", error);
  }
}

/** Concede un rol de Discord por su ID sin tocar el resto de roles del miembro. */
export async function otorgarRolPorId(discordId: string, roleId: string): Promise<boolean> {
  if (!process.env.DISCORD_TOKEN) return false;
  const guildId = await resolverGuildId();
  if (!guildId) return false;

  try {
    const res = await fetch(`${API}/guilds/${guildId}/members/${discordId}/roles/${roleId}`, {
      method: "PUT",
      headers: headers(),
    });
    if (!res.ok && res.status !== 204) {
      console.error("[discord] No se pudo otorgar el rol:", await res.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("[discord] Error otorgando rol:", error);
    return false;
  }
}

/** Retira un rol de Discord por su ID sin tocar el resto de roles del miembro. */
export async function retirarRolPorId(discordId: string, roleId: string): Promise<boolean> {
  if (!process.env.DISCORD_TOKEN) return false;
  const guildId = await resolverGuildId();
  if (!guildId) return false;

  try {
    const res = await fetch(`${API}/guilds/${guildId}/members/${discordId}/roles/${roleId}`, {
      method: "DELETE",
      headers: headers(),
    });
    if (!res.ok && res.status !== 204) {
      console.error("[discord] No se pudo retirar el rol:", await res.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("[discord] Error retirando rol:", error);
    return false;
  }
}
