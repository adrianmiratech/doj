import { AuditLogEvent, Events, PermissionFlagsBits, type Client, type Guild } from "discord.js";
import type { PrismaClient } from "../generated/prisma/client";
import { enviarLogDiscord, alertaExenta } from "./discord-logs";

type PrismaLike = Pick<InstanceType<typeof PrismaClient>, "canalLog" | "alertaWhitelist" | "configSeguridad">;

type ConfigActual = {
  escaneoActivo: boolean;
  ventanaRaidMs: number;
  umbralRaid: number;
  ventanaNukeMs: number;
  umbralNuke: number;
  ventanaSancionesMs: number;
  umbralSanciones: number;
  umbralBorradoMasivo: number;
};

const CONFIG_DEFECTO: ConfigActual = {
  escaneoActivo: true,
  ventanaRaidMs: 10_000,
  umbralRaid: 5,
  ventanaNukeMs: 30_000,
  umbralNuke: 3,
  ventanaSancionesMs: 30_000,
  umbralSanciones: 3,
  umbralBorradoMasivo: 10,
};

const REFRESCO_CONFIG_MS = 2 * 60_000;

// Umbrales de detección de raid/nuke: ventanas deslizantes en memoria (el bot
// corre en un único proceso, así que no hace falta persistirlas). Los valores
// se cargan de ConfigSeguridad (editable desde el panel web) y se refrescan
// cada REFRESCO_CONFIG_MS para no consultar la base en cada evento.
let config: ConfigActual = CONFIG_DEFECTO;

async function cargarConfig(prisma: PrismaLike) {
  try {
    config = await prisma.configSeguridad.upsert({
      where: { id: "singleton" },
      create: { id: "singleton" },
      update: {},
    });
  } catch (error) {
    console.error("[discord] No se pudo cargar ConfigSeguridad, usando valores por defecto:", error);
  }
}

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

// Detección de enlaces/dominios en mensajes, para recordar la web oficial
// cuando alguien pone un enlace que no es el nuestro (ej. una web antigua o
// un enlace de phishing haciéndose pasar por el Departamento).
const DOMINIO_OFICIAL = "doj.cat";
const MENSAJE_URL_OFICIAL = "🌐 La web oficial del Departamento de Justicia es **https://www.doj.cat**";
const REGEX_ENLACE =
  /(?:https?:\/\/|www\.)[^\s<>"')\]]+|\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9-]{1,63})*\.(?:com|net|org|es|cat|io|gg|info|co|app|dev|me|link|xyz|club|shop|top|gov|edu|biz|tv|cc|ai|us|uk|de|fr|it|gl|page|site)\b/gi;

function extraerDominio(coincidencia: string): string {
  return coincidencia
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];
}

/** True si el texto trae al menos un enlace/dominio que no es el sitio oficial (doj.cat). */
function contieneEnlaceNoOficial(texto: string): boolean {
  const coincidencias = texto.match(REGEX_ENLACE);
  if (!coincidencias || coincidencias.length === 0) return false;
  return coincidencias.some((c) => extraerDominio(c) !== DOMINIO_OFICIAL);
}

/** Busca en el registro de auditoría quién ejecutó una acción reciente. Requiere permiso "Ver registro de auditoría"; si falta, degrada a "desconocido". */
async function ejecutorDe(guild: Guild, tipo: AuditLogEvent, objetivoId?: string): Promise<{ tag: string; id: string | null }> {
  try {
    const logs = await guild.fetchAuditLogs({ type: tipo, limit: 5 });
    const entrada = objetivoId ? logs.entries.find((e) => e.targetId === objetivoId) : logs.entries.first();
    return { tag: entrada?.executor?.tag ?? "desconocido", id: entrada?.executor?.id ?? null };
  } catch {
    return { tag: "desconocido", id: null };
  }
}

/**
 * Avisa por DM (embed) al owner del servidor. Si `ejecutorId` está en la
 * whitelist de pruebas (AlertaWhitelist), no envía nada — así las pruebas
 * del propio equipo no generan falsas alarmas al owner.
 */
async function avisarOwner(client: Client, prisma: PrismaLike, titulo: string, descripcion: string, ejecutorId?: string | null) {
  if (!config.escaneoActivo) return;
  const guild = client.guilds.cache.first();
  if (!guild) return;
  try {
    if (ejecutorId && (await alertaExenta(prisma, { discordId: ejecutorId }))) {
      console.log("[discord] Alerta al owner omitida (ejecutor en whitelist de pruebas).");
      return;
    }
    const owner = await guild.fetchOwner();
    await owner.send({
      embeds: [{ title: `🚨 ${titulo}`, description: descripcion, color: 0xdc3545, timestamp: new Date().toISOString() }],
    });
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
  cargarConfig(prisma).catch(console.error);
  setInterval(() => cargarConfig(prisma).catch(console.error), REFRESCO_CONFIG_MS);

  const log = (mensaje: string) => {
    if (!config.escaneoActivo) return;
    enviarLogDiscord(prisma, "actividad", mensaje).catch(console.error);
  };

  client.on(Events.MessageCreate, (message) => {
    if (!message.guild || message.author.id === client.user?.id) return;
    if (message.mentions.everyone) {
      log(`📢 **${message.author.tag}** mencionó a @everyone/@here en <#${message.channelId}>.`);
      avisarOwner(
        client,
        prisma,
        "Mención masiva sospechosa",
        `${message.author.tag} mencionó a @everyone/@here en <#${message.channelId}>.\n${recortar(message.content)}`,
        message.author.id,
      ).catch(console.error);
    }

    if (contenidoDisponible && contieneEnlaceNoOficial(message.content) && "send" in message.channel) {
      message.channel.send(MENSAJE_URL_OFICIAL).catch(console.error);
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
    if (cantidad >= config.umbralBorradoMasivo) {
      avisarOwner(
        client,
        prisma,
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
    const enVentana = registrarEnVentana(ingresos, ahora, config.ventanaRaidMs);
    const cuentaNueva = ahora - member.user.createdTimestamp < 24 * 3_600_000;
    log(`📥 **${member.user.tag}** se unió al servidor${cuentaNueva ? " ⚠️ *(cuenta creada hace menos de 24h)*" : ""}.`);
    if (enVentana >= config.umbralRaid) {
      avisarOwner(
        client,
        prisma,
        "Posible raid de entradas masivas",
        `${enVentana} cuentas se unieron al servidor en menos de ${config.ventanaRaidMs / 1000}s. Última: ${member.user.tag}.`,
        member.user.id,
      ).catch(console.error);
    }
  });

  client.on(Events.GuildMemberRemove, async (member) => {
    const ejecutor = member.guild ? await ejecutorDe(member.guild, AuditLogEvent.MemberKick, member.id) : { tag: "desconocido", id: null };
    const motivo = ejecutor.tag !== "desconocido" ? `fue expulsado por **${ejecutor.tag}**` : "salió del servidor";
    log(`📤 **${member.user?.tag ?? member.id}** ${motivo}.`);
  });

  client.on(Events.GuildBanAdd, async (ban) => {
    const ahora = Date.now();
    const enVentana = registrarEnVentana(sanciones, ahora, config.ventanaSancionesMs);
    const ejecutor = await ejecutorDe(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
    log(`🔨 **${ban.user.tag}** fue baneado por **${ejecutor.tag}**.`);
    if (enVentana >= config.umbralSanciones) {
      await avisarOwner(
        client,
        prisma,
        "Cadena de baneos",
        `${enVentana} baneos en menos de ${config.ventanaSancionesMs / 1000}s. Último: ${ban.user.tag} (por ${ejecutor.tag}).`,
        ejecutor.id,
      );
    }
  });

  client.on(Events.GuildBanRemove, (ban) => {
    log(`♻️ **${ban.user.tag}** fue desbaneado.`);
  });

  client.on(Events.ChannelCreate, async (channel) => {
    const ejecutor = await ejecutorDe(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
    log(`📁 Canal **#${channel.name}** creado por **${ejecutor.tag}**.`);
  });

  client.on(Events.ChannelDelete, async (channel) => {
    if (channel.isDMBased()) return;
    const ahora = Date.now();
    const enVentana = registrarEnVentana(borradosEstructura, ahora, config.ventanaNukeMs);
    const ejecutor = await ejecutorDe(channel.guild, AuditLogEvent.ChannelDelete);
    log(`📁 Canal **#${channel.name}** borrado por **${ejecutor.tag}**.`);
    if (enVentana >= config.umbralNuke) {
      await avisarOwner(
        client,
        prisma,
        "Posible nuke del servidor",
        `${enVentana} canales/roles borrados en menos de ${config.ventanaNukeMs / 1000}s. Último ejecutor detectado: ${ejecutor.tag}.`,
        ejecutor.id,
      );
    }
  });

  client.on(Events.GuildRoleCreate, async (role) => {
    const ejecutor = await ejecutorDe(role.guild, AuditLogEvent.RoleCreate, role.id);
    const peligroso = role.permissions.has(PermissionFlagsBits.Administrator);
    log(`🏷️ Rol **${role.name}** creado por **${ejecutor.tag}**${peligroso ? " ⚠️ *(con permiso de Administrador)*" : ""}.`);
    if (peligroso) {
      await avisarOwner(
        client,
        prisma,
        "Rol con permisos de Administrador creado",
        `Se creó el rol **${role.name}** con permiso de Administrador. Ejecutor: ${ejecutor.tag}.`,
        ejecutor.id,
      );
    }
  });

  client.on(Events.GuildRoleDelete, async (role) => {
    const ahora = Date.now();
    const enVentana = registrarEnVentana(borradosEstructura, ahora, config.ventanaNukeMs);
    const ejecutor = await ejecutorDe(role.guild, AuditLogEvent.RoleDelete);
    log(`🏷️ Rol **${role.name}** borrado por **${ejecutor.tag}**.`);
    if (enVentana >= config.umbralNuke) {
      await avisarOwner(
        client,
        prisma,
        "Posible nuke del servidor",
        `${enVentana} canales/roles borrados en menos de ${config.ventanaNukeMs / 1000}s. Último ejecutor detectado: ${ejecutor.tag}.`,
        ejecutor.id,
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
