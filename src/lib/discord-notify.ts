const COLOR_DOJ = 0xc9a227;
const FOOTER = { text: "Alfonso Miler · Secretario del Departamento" };

function headers(extra?: Record<string, string>) {
  return {
    Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function abrirDM(discordId: string): Promise<string | null> {
  const res = await fetch("https://discord.com/api/v10/users/@me/channels", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ recipient_id: discordId }),
  });
  if (!res.ok) {
    console.error("No se pudo abrir el canal de DM con", discordId, await res.text());
    return null;
  }
  return ((await res.json()) as { id: string }).id;
}

/**
 * Envia un mensaje directo de Discord a un usuario (como embed) usando la
 * API REST de Discord con el token del bot, sin depender de que el proceso
 * del bot (bot/index.ts) este vivo — solo hace falta el token en el entorno.
 * Si el usuario no tiene discordId vinculado, o el envio falla (DMs
 * cerrados, token invalido...), no lanza: solo lo registra en consola,
 * para no romper la accion que disparo la notificacion.
 */
export async function notificarDiscord(discordId: string | null | undefined, mensaje: string) {
  if (!discordId) return;
  if (!process.env.DISCORD_TOKEN) return;

  try {
    const canalId = await abrirDM(discordId);
    if (!canalId) return;

    const msgRes = await fetch(`https://discord.com/api/v10/channels/${canalId}/messages`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        embeds: [{ description: mensaje, color: COLOR_DOJ, footer: FOOTER, timestamp: new Date().toISOString() }],
      }),
    });
    if (!msgRes.ok) {
      console.error("No se pudo enviar el DM a", discordId, await msgRes.text());
    }
  } catch (error) {
    console.error("Error notificando por Discord:", error);
  }
}

/** Igual que notificarDiscord, pero adjunta un archivo (p. ej. un PDF) al mensaje directo. */
export async function notificarDiscordConAdjunto(
  discordId: string | null | undefined,
  mensaje: string,
  adjunto: { nombre: string; datos: Buffer; tipoMime: string },
) {
  if (!discordId) return;
  if (!process.env.DISCORD_TOKEN) return;

  try {
    const canalId = await abrirDM(discordId);
    if (!canalId) return;

    const form = new FormData();
    form.append(
      "payload_json",
      JSON.stringify({
        embeds: [{ description: mensaje, color: COLOR_DOJ, footer: FOOTER, timestamp: new Date().toISOString() }],
      }),
    );
    form.append("files[0]", new Blob([new Uint8Array(adjunto.datos)], { type: adjunto.tipoMime }), adjunto.nombre);

    const msgRes = await fetch(`https://discord.com/api/v10/channels/${canalId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` },
      body: form,
    });
    if (!msgRes.ok) {
      console.error("No se pudo enviar el DM con adjunto a", discordId, await msgRes.text());
    }
  } catch (error) {
    console.error("Error notificando por Discord (adjunto):", error);
  }
}
