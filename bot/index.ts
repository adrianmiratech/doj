import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ChannelType,
  MessageFlags,
  type Interaction,
  type GuildMember,
  type PartialGuildMember,
} from "discord.js";
import bcrypt from "bcryptjs";
import cron from "node-cron";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";
import { crearNominaInicial, cerrarSemanaYGenerarNuevas, tarifaHoraDe } from "../src/lib/nominas-auto";
import { asegurarRolesDiscord, sincronizarMiembroDiscord, otorgarRolPorId } from "../src/lib/discord-roles";
import { asegurarCanalesLogDiscord, enviarLogDiscord } from "../src/lib/discord-logs";
import { registrarEscaneoServidor } from "../src/lib/discord-scanner";
import { enviarMensajeCanal } from "../src/lib/discord-control";
import { ROLE_LABELS, STAFF_ROLES } from "../src/lib/labels";
import { generarPasswordTemporal } from "../src/lib/password";

const TOKEN = process.env.DISCORD_TOKEN!;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const APP_URL = process.env.APP_URL ?? "http://localhost:4173";

const NOMBRE_BOT = "Alfonso Miler";
const CANAL_VERIFICACION_ID = "1541386718136242228";
const ROL_CIVIL_VERIFICADO_ID = "1541389546074411028";
const CANAL_ALERTA_4H_ID = "1541395639781564529";
const HORAS_ALERTA_SERVICIO = 4;
const BOTON_VERIFICAR_ID = "verificar_civil";
const CANAL_BIENVENIDA_ID = "1541360682635632762";
const CANAL_PANEL_TICKETS_ID = "1541401067294687262";
const CATEGORIA_TICKETS_ID = "1541401110684893254";
const BOTON_ABRIR_TICKET_ID = "abrir_ticket";
const BOTON_CERRAR_TICKET_ID = "cerrar_ticket";
const BOTON_RECLAMAR_TICKET_ID = "reclamar_ticket";

if (!TOKEN || !CLIENT_ID) {
  console.error("Faltan DISCORD_TOKEN o DISCORD_CLIENT_ID en el .env");
  process.exit(1);
}

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

const RANGOS = (STAFF_ROLES as readonly string[])
  .filter((r) => r !== "JUEZ_SUPREMO")
  .map((r) => ({ name: ROLE_LABELS[r], value: r }));

function normalizar(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

async function generarEmail(nombre: string, apellidos: string) {
  const base = `${normalizar(nombre)}.${normalizar(apellidos.split(" ")[0] ?? apellidos)}`;
  let email = `${base}@doj.es`;
  let n = 1;
  while (await prisma.user.findUnique({ where: { email } })) {
    email = `${base}${n}@doj.es`;
    n++;
  }
  return email;
}

const contratarCommand = new SlashCommandBuilder()
  .setName("contratar")
  .setDescription("Contrata a un nuevo empleado del Departamento de Justicia")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario de Discord contratado").setRequired(true))
  .addStringOption((opt) => opt.setName("nombre").setDescription("Nombre del personaje").setRequired(true))
  .addStringOption((opt) => opt.setName("apellidos").setDescription("Apellidos del personaje").setRequired(true))
  .addStringOption((opt) =>
    opt
      .setName("rango")
      .setDescription("Rango asignado")
      .setRequired(true)
      .addChoices(...RANGOS.map((r) => ({ name: r.name, value: r.value }))),
  )
  .addStringOption((opt) => opt.setName("cargo").setDescription("Destino / especialidad (opcional)"))
  .addStringOption((opt) => opt.setName("dni").setDescription("DNI del personaje (opcional)"));

const encargadoSapdCommand = new SlashCommandBuilder()
  .setName("encargado-sapd")
  .setDescription("Otorga el acceso de Encargado SAPD a un usuario")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario de Discord").setRequired(true))
  .addStringOption((opt) => opt.setName("nombre").setDescription("Nombre del personaje").setRequired(true))
  .addStringOption((opt) => opt.setName("apellidos").setDescription("Apellidos del personaje").setRequired(true))
  .addStringOption((opt) => opt.setName("dni").setDescription("DNI del personaje (opcional)"));

const staffCommand = new SlashCommandBuilder()
  .setName("staff")
  .setDescription("Da de alta a un miembro del staff/moderación del servidor (no es personal del DOJ)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario de Discord").setRequired(true))
  .addStringOption((opt) => opt.setName("nombre").setDescription("Nombre").setRequired(true))
  .addStringOption((opt) => opt.setName("apellidos").setDescription("Apellidos").setRequired(true));

async function registrarComandos() {
  const rest = new REST().setToken(TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), {
    body: [contratarCommand.toJSON(), encargadoSapdCommand.toJSON(), staffCommand.toJSON()],
  });
  console.log("Comandos de aplicación registrados.");
}

async function manejarContratar(interaction: Interaction) {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "contratar") return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const discordUser = interaction.options.getUser("usuario", true);
  const nombre = interaction.options.getString("nombre", true).trim();
  const apellidos = interaction.options.getString("apellidos", true).trim();
  const dni = interaction.options.getString("dni")?.trim() || null;
  const rango = interaction.options.getString("rango", true);
  const cargo = interaction.options.getString("cargo")?.trim() || null;

  try {
    const dniExistente = dni ? await prisma.user.findUnique({ where: { dni } }) : null;
    if (dniExistente) {
      await interaction.editReply(`Ya existe una cuenta con el DNI \`${dni}\`.`);
      return;
    }

    const email = await generarEmail(nombre, apellidos);
    const password = generarPasswordTemporal();
    const count = await prisma.user.count();
    const legajo = String(1000 + count);

    const empleado = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 10),
        nombre,
        apellidos,
        dni,
        discordId: discordUser.id,
        role: rango as never,
        cargo,
        legajo,
        tourCompletado: false,
      },
    });

    await prisma.contratoLaboral.create({
      data: {
        userId: empleado.id,
        puesto: cargo ?? ROLE_LABELS[rango],
        salarioBase: await tarifaHoraDe(prisma, empleado.id),
        estado: "PENDIENTE_FIRMA",
      },
    });
    await crearNominaInicial(prisma, empleado.id);

    await sincronizarMiembroDiscord(prisma, discordUser.id, rango, `${nombre} ${apellidos} - #${legajo}`);

    await enviarLogDiscord(
      prisma,
      "empleados",
      `🆕 **${nombre} ${apellidos}** contratado como **${ROLE_LABELS[rango]}** (placa #${legajo}) vía \`/contratar\` por ${interaction.user.tag}.`,
    );

    const embed = new EmbedBuilder()
      .setColor(0xc9a227)
      .setTitle("Bienvenido al Departamento de Justicia")
      .setDescription(
        `Has sido contratado como **${ROLE_LABELS[rango]}**${cargo ? ` (${cargo})` : ""} en el Departamento de Justicia de Old State RP.\nEntra al portal para firmar tu contrato laboral.`,
      )
      .addFields(
        { name: "Portal", value: APP_URL },
        { name: "Correo", value: email },
        { name: "Contraseña temporal", value: `\`${password}\`` },
        { name: "Placa", value: `#${legajo}` },
      )
      .setFooter({ text: "Cambia tu contraseña desde Configuración tras iniciar sesión." });

    let dmEnviado = true;
    try {
      await discordUser.send({ embeds: [embed] });
    } catch {
      dmEnviado = false;
    }

    await interaction.editReply(
      dmEnviado
        ? `✅ ${discordUser} contratado como **${ROLE_LABELS[rango]}** y notificado por mensaje privado.`
        : `✅ ${discordUser} contratado como **${ROLE_LABELS[rango]}**, pero no se le pudo enviar el mensaje privado (tiene los DM cerrados). Correo: \`${email}\` · Contraseña: \`${password}\``,
    );
  } catch (error) {
    console.error(error);
    await interaction.editReply("Ocurrió un error al contratar al empleado. Revisa los datos e inténtalo de nuevo.");
  }
}

async function manejarEncargadoSapd(interaction: Interaction) {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "encargado-sapd") return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const discordUser = interaction.options.getUser("usuario", true);
  const nombre = interaction.options.getString("nombre", true).trim();
  const apellidos = interaction.options.getString("apellidos", true).trim();
  const dni = interaction.options.getString("dni")?.trim() || null;

  try {
    const dniExistente = dni ? await prisma.user.findUnique({ where: { dni } }) : null;
    if (dniExistente) {
      await interaction.editReply(`Ya existe una cuenta con el DNI \`${dni}\`.`);
      return;
    }

    const email = await generarEmail(nombre, apellidos);
    const password = generarPasswordTemporal();

    // El SAPD no lleva placa en nuestro sistema (es un departamento aparte, con su propia numeracion).
    const encargado = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 10),
        nombre,
        apellidos,
        dni,
        discordId: discordUser.id,
        role: "ENCARGADO_SAPD",
        tourCompletado: false,
      },
    });

    await sincronizarMiembroDiscord(prisma, discordUser.id, "ENCARGADO_SAPD", `${nombre} ${apellidos}`);
    await enviarLogDiscord(
      prisma,
      "empleados",
      `🆕 **${nombre} ${apellidos}** dado de alta como **Encargado SAPD** por ${interaction.user.tag}.`,
    );

    const embed = new EmbedBuilder()
      .setColor(0x2b6cb0)
      .setTitle("Acceso SAPD concedido")
      .setDescription(
        `Has sido dado de alta como **Encargado SAPD**. Entra al portal para gestionar tu plantilla de agentes.`,
      )
      .addFields(
        { name: "Portal", value: APP_URL },
        { name: "Correo", value: email },
        { name: "Contraseña temporal", value: `\`${password}\`` },
      );

    let dmEnviado = true;
    try {
      await discordUser.send({ embeds: [embed] });
    } catch {
      dmEnviado = false;
    }

    await interaction.editReply(
      dmEnviado
        ? `✅ ${discordUser} dado de alta como **Encargado SAPD** y notificado por mensaje privado.`
        : `✅ ${discordUser} dado de alta como **Encargado SAPD**, pero no se le pudo enviar el mensaje privado. Correo: \`${email}\` · Contraseña: \`${password}\``,
    );
  } catch (error) {
    console.error(error);
    await interaction.editReply("Ocurrió un error al otorgar el acceso. Revisa los datos e inténtalo de nuevo.");
  }
}

async function manejarStaff(interaction: Interaction) {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "staff") return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const discordUser = interaction.options.getUser("usuario", true);
  const nombre = interaction.options.getString("nombre", true).trim();
  const apellidos = interaction.options.getString("apellidos", true).trim();

  try {
    const existente = await prisma.user.findFirst({ where: { discordId: discordUser.id } });
    if (existente) {
      await interaction.editReply(
        `⚠️ ${discordUser} ya tiene una cuenta registrada (**${existente.nombre} ${existente.apellidos}**, rango **${ROLE_LABELS[existente.role] ?? existente.role}**). Si hace falta cambiarla, hazlo manualmente desde el panel (Empleados o Staff).`,
      );
      return;
    }

    const email = await generarEmail(nombre, apellidos);
    const password = generarPasswordTemporal();

    const staff = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 10),
        nombre,
        apellidos,
        discordId: discordUser.id,
        role: "STAFF",
        tourCompletado: false,
      },
    });

    await sincronizarMiembroDiscord(prisma, staff.discordId, "STAFF", `${nombre} ${apellidos}`);
    await enviarLogDiscord(
      prisma,
      "empleados",
      `🛡️ **${nombre} ${apellidos}** dado de alta como **Staff** vía \`/staff\` por ${interaction.user.tag}.`,
    );

    const embed = new EmbedBuilder()
      .setColor(0xc9a227)
      .setTitle("Acceso de Staff concedido")
      .setDescription(
        "Has sido dado de alta como **Staff** del servidor de Old State RP. Entra al portal con estas credenciales.",
      )
      .addFields(
        { name: "Portal", value: APP_URL },
        { name: "Correo", value: email },
        { name: "Contraseña temporal", value: `\`${password}\`` },
      )
      .setFooter({ text: "Cambia tu contraseña desde Configuración tras iniciar sesión." });

    let dmEnviado = true;
    try {
      await discordUser.send({ embeds: [embed] });
    } catch {
      dmEnviado = false;
    }

    await interaction.editReply(
      dmEnviado
        ? `✅ ${discordUser} dado de alta como **Staff** y notificado por mensaje privado.`
        : `✅ ${discordUser} dado de alta como **Staff**, pero no se le pudo enviar el mensaje privado (tiene los DM cerrados). Correo: \`${email}\` · Contraseña: \`${password}\``,
    );
  } catch (error) {
    console.error(error);
    await interaction.editReply("Ocurrió un error al dar de alta al staff. Revisa los datos e inténtalo de nuevo.");
  }
}

async function manejarBotonVerificacion(interaction: Interaction) {
  if (!interaction.isButton() || interaction.customId !== BOTON_VERIFICAR_ID) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const ok = await otorgarRolPorId(interaction.user.id, ROL_CIVIL_VERIFICADO_ID);
  await interaction.editReply(
    ok ? "✅ Verificado. Ya tienes acceso como ciudadano." : "⚠️ No se pudo asignar el rol, avisa a un administrador.",
  );
}

/** Publica (una sola vez) el panel de verificación con botón en el canal configurado. */
async function asegurarPanelVerificacion(client: Client) {
  try {
    const canal = await client.channels.fetch(CANAL_VERIFICACION_ID);
    if (!canal || !canal.isTextBased() || !("send" in canal)) return;

    const mensajes = await canal.messages.fetch({ limit: 20 });
    const yaExiste = mensajes.some(
      (m) => m.author.id === client.user?.id && m.components.length > 0,
    );
    if (yaExiste) return;

    const boton = new ButtonBuilder()
      .setCustomId(BOTON_VERIFICAR_ID)
      .setLabel("Verificarme como ciudadano")
      .setStyle(ButtonStyle.Success);
    const fila = new ActionRowBuilder<ButtonBuilder>().addComponents(boton);

    const embed = new EmbedBuilder()
      .setColor(0xc9a227)
      .setTitle("Verificación de ciudadano")
      .setDescription("Pulsa el botón para verificarte y obtener acceso al servidor como ciudadano.");

    await canal.send({ embeds: [embed], components: [fila] });
    console.log("[discord] Panel de verificación publicado.");
  } catch (error) {
    console.error("[discord] No se pudo publicar el panel de verificación:", error);
  }
}

/** Renombra el bot a su nombre de secretario del Departamento (una sola vez). */
async function asegurarNombreBot(client: Client) {
  if (client.user?.username === NOMBRE_BOT) return;
  try {
    const res = await fetch("https://discord.com/api/v10/users/@me", {
      method: "PATCH",
      headers: { Authorization: `Bot ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ username: NOMBRE_BOT }),
    });
    if (res.ok) console.log(`[discord] Bot renombrado a "${NOMBRE_BOT}".`);
    else console.error("[discord] No se pudo renombrar el bot:", await res.text());
  } catch (error) {
    console.error("[discord] Error renombrando el bot:", error);
  }
}

/** Envía los mensajes programados (panel de Seguridad) cuya fecha ya se cumplió. */
async function revisarMensajesProgramados() {
  const pendientes = await prisma.mensajeProgramado.findMany({
    where: { enviado: false, enviarEn: { lte: new Date() } },
  });
  for (const m of pendientes) {
    const resultado = await enviarMensajeCanal(m.channelId, m.mensaje);
    if (resultado.ok) {
      await prisma.mensajeProgramado.update({ where: { id: m.id }, data: { enviado: true } });
      console.log(`[bot] Mensaje programado enviado a #${m.channelNombre}.`);
    } else {
      console.error(`[bot] No se pudo enviar el mensaje programado ${m.id}:`, resultado.error);
    }
  }
}

/** Avisa por Discord a quien lleve más de HORAS_ALERTA_SERVICIO fichado sin cerrar turno. */
async function revisarFichajesLargos(client: Client) {
  const limite = new Date(Date.now() - HORAS_ALERTA_SERVICIO * 3600000);
  const abiertos = await prisma.fichaje.findMany({
    where: { salida: null, alertado4h: false, entrada: { lt: limite } },
    include: { user: true },
  });
  if (abiertos.length === 0) return;

  try {
    const canal = await client.channels.fetch(CANAL_ALERTA_4H_ID);
    if (!canal || !canal.isTextBased() || !("send" in canal)) return;

    for (const f of abiertos) {
      const mencion = f.user.discordId ? `<@${f.user.discordId}>` : `${f.user.nombre} ${f.user.apellidos}`;
      await canal.send(
        `⏰ ${mencion} lleva más de ${HORAS_ALERTA_SERVICIO}h en servicio sin fichar salida (desde las ${f.entrada.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}). Si ya terminaste tu turno, no olvides cerrar el fichaje.`,
      );
      await prisma.fichaje.update({ where: { id: f.id }, data: { alertado4h: true } });
    }
  } catch (error) {
    console.error("[discord] Error avisando fichajes largos:", error);
  }
}

/** Da la bienvenida a quien entra al servidor de Discord. Requiere el intent de miembros. */
async function manejarBienvenida(member: GuildMember) {
  try {
    const canal = await member.client.channels.fetch(CANAL_BIENVENIDA_ID);
    if (!canal || !canal.isTextBased() || !("send" in canal)) return;
    await canal.send(
      `👋 ¡Bienvenido/a ${member} a Old State RP! Verifícate como ciudadano en <#${CANAL_VERIFICACION_ID}> para tener acceso completo al servidor.\n— Alfonso Miler, Secretario del Departamento`,
    );
  } catch (error) {
    console.error("[discord] Error dando la bienvenida:", error);
  }
}

/** Publica (una sola vez) el panel de tickets con botón en el canal configurado. */
async function asegurarPanelTickets(client: Client) {
  try {
    const canal = await client.channels.fetch(CANAL_PANEL_TICKETS_ID);
    if (!canal || !canal.isTextBased() || !("send" in canal)) return;

    const mensajes = await canal.messages.fetch({ limit: 20 });
    const yaExiste = mensajes.some((m) => m.author.id === client.user?.id && m.components.length > 0);
    if (yaExiste) return;

    const boton = new ButtonBuilder()
      .setCustomId(BOTON_ABRIR_TICKET_ID)
      .setLabel("Abrir ticket")
      .setEmoji("🎫")
      .setStyle(ButtonStyle.Primary);
    const fila = new ActionRowBuilder<ButtonBuilder>().addComponents(boton);

    const embed = new EmbedBuilder()
      .setColor(0xc9a227)
      .setTitle("Soporte general")
      .setDescription("Pulsa el botón para abrir un ticket privado con el staff.");

    await canal.send({ embeds: [embed], components: [fila] });
    console.log("[discord] Panel de tickets publicado.");
  } catch (error) {
    console.error("[discord] No se pudo publicar el panel de tickets:", error);
  }
}

function filaBotonesTicket(reclamadoPor?: string) {
  const botonReclamar = new ButtonBuilder()
    .setCustomId(BOTON_RECLAMAR_TICKET_ID)
    .setLabel(reclamadoPor ? "Reclamado" : "Reclamar ticket")
    .setEmoji("🙋")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(!!reclamadoPor);
  const botonCerrar = new ButtonBuilder()
    .setCustomId(BOTON_CERRAR_TICKET_ID)
    .setLabel("Cerrar ticket")
    .setEmoji("🔒")
    .setStyle(ButtonStyle.Danger);
  return new ActionRowBuilder<ButtonBuilder>().addComponents(botonReclamar, botonCerrar);
}

function embedTicket(usuario: string, estado: string) {
  return new EmbedBuilder()
    .setColor(0xc9a227)
    .setTitle("🎫 Ticket de soporte")
    .setDescription(`Abierto por ${usuario}. Un miembro del staff te atenderá en breve.`)
    .addFields({ name: "Estado", value: estado })
    .setFooter({ text: "Alfonso Miler · Secretario del Departamento" })
    .setTimestamp();
}

async function manejarBotonAbrirTicket(interaction: Interaction) {
  if (!interaction.isButton() || interaction.customId !== BOTON_ABRIR_TICKET_ID) return;
  if (!interaction.inGuild() || !interaction.guild) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // Los rangos del sistema (excepto Civil) pueden ver y atender los tickets.
    const rolesGuild = interaction.guild.roles.cache;
    const overwritesStaff = Object.entries(ROLE_LABELS)
      .filter(([key]) => key !== "CIVIL")
      .map(([, label]) => rolesGuild.find((r) => r.name === label))
      .filter((r): r is NonNullable<typeof r> => !!r)
      .map((r) => ({
        id: r.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      }));

    const nombreCanal = `ticket-${normalizar(interaction.user.username).slice(0, 20)}`;
    const canal = await interaction.guild.channels.create({
      name: nombreCanal,
      type: ChannelType.GuildText,
      parent: CATEGORIA_TICKETS_ID,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
        ...overwritesStaff,
      ],
    });

    await canal.send({
      content: `${interaction.user}`,
      embeds: [embedTicket(`${interaction.user}`, "🟡 Sin reclamar")],
      components: [filaBotonesTicket()],
    });

    await interaction.editReply(`✅ Ticket creado: ${canal}`);
  } catch (error) {
    console.error("[discord] Error creando ticket:", error);
    await interaction.editReply("⚠️ No se pudo crear el ticket, avisa a un administrador.");
  }
}

async function manejarBotonReclamarTicket(interaction: Interaction) {
  if (!interaction.isButton() || interaction.customId !== BOTON_RECLAMAR_TICKET_ID) return;
  if (!interaction.message.embeds[0]) return;

  const original = interaction.message.embeds[0];
  const descripcion = original.description ?? "";
  const nuevoEmbed = EmbedBuilder.from(original)
    .setFields({ name: "Estado", value: `🟢 Reclamado por ${interaction.user}` })
    .setDescription(descripcion);

  await interaction.update({ embeds: [nuevoEmbed], components: [filaBotonesTicket(interaction.user.id)] });
}

async function manejarBotonCerrarTicket(interaction: Interaction) {
  if (!interaction.isButton() || interaction.customId !== BOTON_CERRAR_TICKET_ID) return;
  if (!interaction.channel || interaction.channel.type !== ChannelType.GuildText) return;
  if (!interaction.channel.name.startsWith("ticket-")) return;

  await interaction.reply({
    embeds: [new EmbedBuilder().setColor(0xdc3545).setDescription(`🔒 Ticket cerrado por ${interaction.user}. Se borrará en unos segundos…`)],
  });
  const canal = interaction.channel;
  setTimeout(() => {
    canal.delete().catch((error) => console.error("[discord] Error cerrando ticket:", error));
  }, 5000);
}

/**
 * Cuando alguien cambia manualmente los roles de rango de un miembro en
 * Discord, refleja el cambio en la web (bidireccional con `cambiarRangoEmpleado`
 * / `crearEmpleado`, que hacen lo mismo en sentido web → Discord).
 * Requiere el intent privilegiado "Server Members Intent".
 */
async function manejarCambioRolDiscord(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
  if (oldMember.roles.cache.size === newMember.roles.cache.size && oldMember.roles.cache.every((r) => newMember.roles.cache.has(r.id))) {
    return;
  }

  const usuario = await prisma.user.findFirst({ where: { discordId: newMember.id } });
  if (!usuario) return;

  const nombresRoles = newMember.roles.cache.map((r) => r.name);
  const rangoDetectado = Object.entries(ROLE_LABELS).find(([, label]) => nombresRoles.includes(label))?.[0];

  if (!rangoDetectado || rangoDetectado === usuario.role || rangoDetectado === "JUEZ_SUPREMO") return;

  await prisma.user.update({ where: { id: usuario.id }, data: { role: rangoDetectado as never } });
  console.log(
    `[discord] Rango actualizado desde Discord: ${usuario.nombre} ${usuario.apellidos} → ${ROLE_LABELS[rangoDetectado]}`,
  );
  await enviarLogDiscord(
    prisma,
    "empleados",
    `🔄 **${usuario.nombre} ${usuario.apellidos}** cambió de rango a **${ROLE_LABELS[rangoDetectado]}** (detectado desde los roles de Discord).`,
  );
}

function registrarHandlers(c: Client, escucharCambiosDeRol: boolean, contenidoDisponible: boolean) {
  c.once("clientReady", async () => {
    console.log(`Bot conectado como ${c.user?.tag}`);
    await registrarComandos();
    await asegurarRolesDiscord(prisma);
    await asegurarCanalesLogDiscord(prisma);
    await asegurarNombreBot(c);
    await asegurarPanelVerificacion(c);
    await asegurarPanelTickets(c);
    registrarEscaneoServidor(c, prisma, contenidoDisponible);
  });

  c.on("interactionCreate", (interaction) => {
    manejarContratar(interaction).catch(console.error);
    manejarEncargadoSapd(interaction).catch(console.error);
    manejarStaff(interaction).catch(console.error);
    manejarBotonVerificacion(interaction).catch(console.error);
    manejarBotonAbrirTicket(interaction).catch(console.error);
    manejarBotonReclamarTicket(interaction).catch(console.error);
    manejarBotonCerrarTicket(interaction).catch(console.error);
  });

  if (escucharCambiosDeRol) {
    c.on("guildMemberUpdate", (oldMember, newMember) => {
      manejarCambioRolDiscord(oldMember, newMember).catch(console.error);
    });
    c.on("guildMemberAdd", (member) => {
      manejarBienvenida(member).catch(console.error);
    });
  }

  c.on("error", console.error);

  cron.schedule("*/15 * * * *", () => {
    revisarFichajesLargos(c).catch(console.error);
  });

  cron.schedule("* * * * *", () => {
    revisarMensajesProgramados().catch(console.error);
  });
}

// Cierre semanal de nominas: cada lunes a las 00:05, calcula el importe real
// de la semana que acaba de terminar (horas fichadas x tarifa/hora) y abre
// una nomina nueva en $0 para la semana que empieza.
cron.schedule("5 0 * * 1", () => {
  console.log("Ejecutando cierre semanal de nóminas…");
  cerrarSemanaYGenerarNuevas(prisma)
    .then(() => console.log("Cierre semanal de nóminas completado."))
    .catch(console.error);
});

// Intents no privilegiados que necesita el escáner de actividad (baneos,
// invitaciones, webhooks y mensajes) además de los ya usados por el resto del bot.
const INTENTS_ESCANEO = [
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildModeration,
  GatewayIntentBits.GuildInvites,
  GatewayIntentBits.GuildWebhooks,
];

function esErrorDeIntents(error: unknown) {
  return String((error as Error)?.message ?? error)
    .toLowerCase()
    .includes("disallowed intents");
}

let client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    ...INTENTS_ESCANEO,
  ],
});
registrarHandlers(client, true, true);

/** Se conecta con los intents dados y sustituye el cliente global si hace falta reintentar con menos. */
async function intentarLogin(intents: GatewayIntentBits[], escucharCambiosDeRol: boolean, contenidoDisponible: boolean) {
  client = new Client({ intents });
  registrarHandlers(client, escucharCambiosDeRol, contenidoDisponible);
  await client.login(TOKEN);
}

async function iniciarBot() {
  try {
    await client.login(TOKEN);
  } catch (error) {
    if (!esErrorDeIntents(error)) throw error;
    console.error(
      "⚠️  Falta activar el intent privilegiado 'Message Content Intent' y/o 'Server Members Intent' en el " +
        "Discord Developer Portal (tu app → Bot → Privileged Gateway Intents). Reintentando sin leer el " +
        "contenido de los mensajes (el escáner seguirá registrando borrados/ediciones sin mostrar el texto)...",
    );
    try {
      await intentarLogin(
        [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, ...INTENTS_ESCANEO],
        true,
        false,
      );
    } catch (error2) {
      if (!esErrorDeIntents(error2)) throw error2;
      console.error(
        "⚠️  Tampoco está activado 'Server Members Intent'. La sincronización automática Discord → Web de " +
          "rangos y la bienvenida a nuevos miembros quedan desactivadas hasta que lo actives y reinicies el " +
          "bot; el resto del bot (contratar, nóminas, notificaciones, escáner de actividad) funciona con normalidad.",
      );
      await intentarLogin([GatewayIntentBits.Guilds, ...INTENTS_ESCANEO], false, false);
    }
  }
}

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  client.destroy();
  process.exit(0);
});

iniciarBot().catch((error) => {
  console.error("No se pudo iniciar el bot de Discord:", error);
  process.exit(1);
});
