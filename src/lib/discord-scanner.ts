import { AuditLogEvent, Events, PermissionFlagsBits, type Client, type Guild } from "discord.js";
import { enviarLogDiscord } from "./discord-logs";

type PrismaLike = Parameters<typeof enviarLogDiscord>[0];

// Umbrales de detección de raid/nuke: ventanas deslizantes en memoria (el bot
// corre en un único proceso, así que no hace falta persistirlas).
const VENTANA_RAID_MS = 10_000;
const UMBRAL_RAID = 5;
const VENTANA_NUKE_MS = 30_000;
const UMBRAL_NUKE = 3;
const VENTANA_SANCIONES_MS = 30_000;
const UMBRAL_SANCIONES = 3;
const UMBRAL_BORRADO_MASIVO = 10;

const ingresos: number[] = [];
const borradosEstructura: number[] = []; // canales + roles borrados
const sanciones: number[] = []; // baneos

function registrarEnVentana(ventana: number[], ahora: number, ms: number) {
  ventana.push(ahora);
  while (ventana.length && ahora - ventana[0] > ms) ventana.shift();
  return ventana.length;
}

function recortar(texto: string | null | undefined, max = 300) {
  if (!texto) return "*(sin contenido)*";
  return texto.length > max ? `${texto.slice(0, max)}…` : texto;
}

/** Busca en el registro de auditoría quién ejecutó una acción reciente. Requiere permiso "Ver registro de auditoría"; si falta, degrada a "desconocido". */
async function ejecutorDe(guild: Guild, tipo: AuditLogEvent, objetivoId?: string): Promise<string> {
  try {
    const logs = await guild.fetchAuditLogs({ type: tipo, limit: 5 });
    const entrada = objetivoId ? logs.entries.find((e) => e.targetId === objetivoId) : logs.entries.first();
    return entrada?.executor?.tag ?? "desconocido";
  } catch {
    return "desconocido";
  }
}

async function avisarOwner(client: Client, titulo: string, descripcion: string) {
  const guild = client.guilds.cache.first();
  if (!guild) return;
  try {
    const owner = await guild.fetchOwner();
    await owner.send(`🚨 **${titulo}**\n${descripcion}`);
  } catch (error) {
    console.error("[discord] No se pudo avisar al owner por DM:", error);
  }
}

/**
 * Activa el escaneo de actividad del servidor: registra en #logs-actividad
 * mensajes borrados/editados, entradas/salidas, baneos, cambios de canales y
 * roles, e invitaciones; y avisa por DM al owner del servidor ante señales de
 * raid, nuke, mención masiva o escalada de privilegios.
 */
export function registrarEscaneoServidor(client: Client, prisma: PrismaLike, contenidoDisponible: boolean) {
  const log = (mensaje: string) => enviarLogDiscord(prisma, "actividad", mensaje).catch(console.error);

  client.on(Events.MessageCreate, (message) => {
    if (!message.guild || message.author.id === client.user?.id) return;
    if (message.mentions.everyone) {
      log(`📢 **${message.author.tag}** mencionó a @everyone/@here en <#${message.channelId}>.`);
      avisarOwner(
        client,
        "Mención masiva sospechosa",
        `${message.author.tag} mencionó a @everyone/@here en <#${message.channelId}>.\n${recortar(message.content)}`,
      ).catch(console.error);
    }
  });

  client.on(Events.MessageDelete, (message) => {
    if (!message.guild || message.author?.id === client.user?.id) return;
    const autor = message.author?.tag ?? "autor desconocido";
    const contenido = contenidoDisponible
      ? recortar(message.content)
      : "*(contenido no disponible: falta el intent 'Message Content')*";
    log(`🗑️ Mensaje borrado en <#${message.channelId}> de **${autor}**: ${contenido}`);
  });

  client.on(Events.MessageBulkDelete, (messages, channel) => {
    const cantidad = messages.size;
    log(`🗑️ Se borraron **${cantidad}** mensajes de golpe en <#${channel.id}>.`);
    if (cantidad >= UMBRAL_BORRADO_MASIVO) {
      avisarOwner(
        client,
        "Borrado masivo de mensajes",
        `Se borraron ${cantidad} mensajes de golpe en <#${channel.id}>. Podría ser un intento de borrar evidencia o un ataque.`,
      ).catch(console.error);
    }
  });

  client.on(Events.MessageUpdate, (oldMessage, newMessage) => {
    if (!newMessage.guild || newMessage.author?.id === client.user?.id) return;
    if (!contenidoDisponible || oldMessage.content === newMessage.content) return;
    log(
      `✏️ Mensaje editado en <#${newMessage.channelId}> por **${newMessage.author?.tag ?? "desconocido"}**:\n` +
        `**Antes:** ${recortar(oldMessage.content)}\n**Después:** ${recortar(newMessage.content)}`,
    );
  });

  client.on(Events.GuildMemberAdd, (member) => {
    const ahora = Date.now();
    const enVentana = registrarEnVentana(ingresos, ahora, VENTANA_RAID_MS);
    const cuentaNueva = ahora - member.user.createdTimestamp < 24 * 3_600_000;
    log(`📥 **${member.user.tag}** se unió al servidor${cuentaNueva ? " ⚠️ *(cuenta creada hace menos de 24h)*" : ""}.`);
    if (enVentana >= UMBRAL_RAID) {
      avisarOwner(
        client,
        "Posible raid de entradas masivas",
        `${enVentana} cuentas se unieron al servidor en menos de ${VENTANA_RAID_MS / 1000}s. Última: ${member.user.tag}.`,
      ).catch(console.error);
    }
  });

  client.on(Events.GuildMemberRemove, async (member) => {
    const ejecutor = member.guild ? await ejecutorDe(member.guild, AuditLogEvent.MemberKick, member.id) : "desconocido";
    const motivo = ejecutor !== "desconocido" ? `fue expulsado por **${ejecutor}**` : "salió del servidor";
    log(`📤 **${member.user?.tag ?? member.id}** ${motivo}.`);
  });

  client.on(Events.GuildBanAdd, async (ban) => {
    const ahora = Date.now();
    const enVentana = registrarEnVentana(sanciones, ahora, VENTANA_SANCIONES_MS);
    const ejecutor = await ejecutorDe(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
    log(`🔨 **${ban.user.tag}** fue baneado por **${ejecutor}**.`);
    if (enVentana >= UMBRAL_SANCIONES) {
      await avisarOwner(
        client,
        "Cadena de baneos",
        `${enVentana} baneos en menos de ${VENTANA_SANCIONES_MS / 1000}s. Último: ${ban.user.tag} (por ${ejecutor}).`,
      );
    }
  });

  client.on(Events.GuildBanRemove, (ban) => {
    log(`♻️ **${ban.user.tag}** fue desbaneado.`);
  });

  client.on(Events.ChannelCreate, async (channel) => {
    const ejecutor = await ejecutorDe(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
    log(`📁 Canal **#${channel.name}** creado por **${ejecutor}**.`);
  });

  client.on(Events.ChannelDelete, async (channel) => {
    if (channel.isDMBased()) return;
    const ahora = Date.now();
    const enVentana = registrarEnVentana(borradosEstructura, ahora, VENTANA_NUKE_MS);
    const ejecutor = await ejecutorDe(channel.guild, AuditLogEvent.ChannelDelete);
    log(`📁 Canal **#${channel.name}** borrado por **${ejecutor}**.`);
    if (enVentana >= UMBRAL_NUKE) {
      await avisarOwner(
        client,
        "Posible nuke del servidor",
        `${enVentana} canales/roles borrados en menos de ${VENTANA_NUKE_MS / 1000}s. Último ejecutor detectado: ${ejecutor}.`,
      );
    }
  });

  client.on(Events.GuildRoleCreate, async (role) => {
    const ejecutor = await ejecutorDe(role.guild, AuditLogEvent.RoleCreate, role.id);
    const peligroso = role.permissions.has(PermissionFlagsBits.Administrator);
    log(`🏷️ Rol **${role.name}** creado por **${ejecutor}**${peligroso ? " ⚠️ *(con permiso de Administrador)*" : ""}.`);
    if (peligroso) {
      await avisarOwner(
        client,
        "Rol con permisos de Administrador creado",
        `Se creó el rol **${role.name}** con permiso de Administrador. Ejecutor: ${ejecutor}.`,
      );
    }
  });

  client.on(Events.GuildRoleDelete, async (role) => {
    const ahora = Date.now();
    const enVentana = registrarEnVentana(borradosEstructura, ahora, VENTANA_NUKE_MS);
    const ejecutor = await ejecutorDe(role.guild, AuditLogEvent.RoleDelete);
    log(`🏷️ Rol **${role.name}** borrado por **${ejecutor}**.`);
    if (enVentana >= UMBRAL_NUKE) {
      await avisarOwner(
        client,
        "Posible nuke del servidor",
        `${enVentana} canales/roles borrados en menos de ${VENTANA_NUKE_MS / 1000}s. Último ejecutor detectado: ${ejecutor}.`,
      );
    }
  });

  client.on(Events.InviteCreate, (invite) => {
    log(
      `🔗 Invitación creada por **${invite.inviter?.tag ?? "desconocido"}** en <#${invite.channelId}> ` +
        `(máx. usos: ${invite.maxUses || "∞"}, expira: ${invite.maxAge ? `${invite.maxAge / 3600}h` : "nunca"}).`,
    );
  });

  client.on(Events.WebhooksUpdate, (channel) => {
    log(`🪝 Se modificaron los webhooks de <#${channel.id}>. Revisa que no se haya creado uno no autorizado.`);
  });

  console.log(
    `[discord] Escáner de actividad activo${contenidoDisponible ? "" : " (sin contenido de mensajes: falta el intent 'Message Content')"}.`,
  );
}
