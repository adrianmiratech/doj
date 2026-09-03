/**
 * Envia un mensaje directo de Discord a un usuario usando la API REST de
 * Discord con el token del bot, sin depender de que el proceso del bot
 * (bot/index.ts) este vivo — solo hace falta el token en el entorno.
 * Si el usuario no tiene discordId vinculado, o el envio falla (DMs
 * cerrados, token invalido...), no lanza: solo lo registra en consola,
 * para no romper la accion que disparo la notificacion.
 */
export async function notificarDiscord(discordId: string | null | undefined, mensaje: string) {
  if (!discordId) return;
  const token = process.env.DISCORD_TOKEN;
  if (!token) return;

  try {
    const canalRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient_id: discordId }),
    });
    if (!canalRes.ok) {
      console.error("No se pudo abrir el canal de DM con", discordId, await canalRes.text());
      return;
    }
    const canal = (await canalRes.json()) as { id: string };

    const firma = "\n\n— *Alfonso Miler, Secretario del Departamento*";
    const msgRes = await fetch(`https://discord.com/api/v10/channels/${canal.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: `${mensaje}${firma}` }),
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
  const token = process.env.DISCORD_TOKEN;
  if (!token) return;

  try {
    const canalRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
      method: "POST",
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_id: discordId }),
    });
    if (!canalRes.ok) {
      console.error("No se pudo abrir el canal de DM con", discordId, await canalRes.text());
      return;
    }
    const canal = (await canalRes.json()) as { id: string };

    const firma = "\n\n— *Alfonso Miler, Secretario del Departamento*";
    const form = new FormData();
    form.append("payload_json", JSON.stringify({ content: `${mensaje}${firma}` }));
    form.append("files[0]", new Blob([new Uint8Array(adjunto.datos)], { type: adjunto.tipoMime }), adjunto.nombre);

    const msgRes = await fetch(`https://discord.com/api/v10/channels/${canal.id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${token}` },
      body: form,
    });
    if (!msgRes.ok) {
      console.error("No se pudo enviar el DM con adjunto a", discordId, await msgRes.text());
    }
  } catch (error) {
    console.error("Error notificando por Discord (adjunto):", error);
  }
}
