import { resolverGuildId, ROL_STAFF_ID } from "./discord-roles";

const API = "https://discord.com/api/v10";
const CATEGORIA_TICKETS_ID = "1541401110684893254";

// Permisos de Discord necesarios para ver/escribir en el canal del ticket.
const VER_ESCRIBIR = (1 << 10) | (1 << 11) | (1 << 16); // VIEW_CHANNEL | SEND_MESSAGES | READ_MESSAGE_HISTORY
const VER_DENEGADO = String(1 << 10); // VIEW_CHANNEL

function headers() {
  return {
    Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function normalizar(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Abre un canal de ticket en la categoría de soporte, visible para el
 * candidato/ciudadano (si tiene Discord vinculado) y para el rol de Staff.
 * Devuelve el ID del canal creado, o null si algo falló.
 */
export async function abrirTicketDiscord(
  nombreBase: string,
  discordIdCandidato: string | null | undefined,
  mensajeInicial: string,
): Promise<string | null> {
  if (!process.env.DISCORD_TOKEN) return null;
  const guildId = await resolverGuildId();
  if (!guildId) return null;

  const overwrites: Record<string, unknown>[] = [
    { id: guildId, type: 0, deny: VER_DENEGADO }, // @everyone (el ID del rol @everyone es el mismo que el del guild)
    { id: ROL_STAFF_ID, type: 0, allow: String(VER_ESCRIBIR) },
  ];
  if (discordIdCandidato) {
    overwrites.push({ id: discordIdCandidato, type: 1, allow: String(VER_ESCRIBIR) });
  }

  try {
    const res = await fetch(`${API}/guilds/${guildId}/channels`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        name: `ticket-${normalizar(nombreBase).slice(0, 24)}`,
        type: 0,
        parent_id: CATEGORIA_TICKETS_ID,
        permission_overwrites: overwrites,
      }),
    });
    if (!res.ok) {
      console.error("[discord] No se pudo crear el canal de ticket:", await res.text());
      return null;
    }
    const canal = (await res.json()) as { id: string };

    await fetch(`${API}/channels/${canal.id}/messages`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        content: `${discordIdCandidato ? `<@${discordIdCandidato}> ` : ""}${mensajeInicial}`,
      }),
    });

    return canal.id;
  } catch (error) {
    console.error("[discord] Error creando ticket:", error);
    return null;
  }
}
