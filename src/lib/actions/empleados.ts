"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Role, Gravedad } from "@/generated/prisma/enums";
import { STAFF_ROLES, ROLE_LABELS } from "@/lib/labels";
import { crearNominaInicial, tarifaHoraDe } from "@/lib/nominas-auto";
import { notificarDiscord } from "@/lib/discord-notify";
import { sincronizarMiembroDiscord } from "@/lib/discord-roles";
import { enviarLogDiscord } from "@/lib/discord-logs";
import { requirePermiso } from "@/lib/permisos";
import { generarPasswordTemporal } from "@/lib/password";
import { guardarAvatar } from "@/lib/uploads";

async function requireGestionEmpleados() {
  return requirePermiso("GESTIONAR_EMPLEADOS");
}

export async function crearEmpleado(formData: FormData) {
  await requireGestionEmpleados();

  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellidos = String(formData.get("apellidos") ?? "").trim();
  const dni = String(formData.get("dni") ?? "").trim();
  const role = String(formData.get("role") ?? "") as Role;
  const cargo = String(formData.get("cargo") ?? "").trim();
  const discordId = String(formData.get("discordId") ?? "").trim();

  if (
    !email ||
    password.length < 6 ||
    !nombre ||
    !apellidos ||
    !STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number])
  ) {
    throw new Error("Datos incompletos o inválidos");
  }

  const count = await prisma.user.count();
  const legajo = String(1000 + count);

  const empleado = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      nombre,
      apellidos,
      dni: dni || null,
      role,
      cargo: cargo || null,
      legajo,
      discordId: discordId || null,
    },
  });

  await prisma.contratoLaboral.create({
    data: {
      userId: empleado.id,
      puesto: cargo || ROLE_LABELS[role],
      salarioBase: await tarifaHoraDe(prisma, empleado.id),
    },
  });

  await crearNominaInicial(prisma, empleado.id);

  await sincronizarMiembroDiscord(empleado.discordId, role, `${nombre} ${apellidos} - #${legajo}`);

  await notificarDiscord(
    empleado.discordId,
    `🏛️ Has sido contratado como **${ROLE_LABELS[role]}** en el Departamento de Justicia. Tienes un contrato laboral pendiente de firmar y tu primera nómina ya está disponible en el portal.\nCorreo: ${email}`,
  );

  await enviarLogDiscord(
    prisma,
    "empleados",
    `🆕 **${nombre} ${apellidos}** contratado como **${ROLE_LABELS[role]}** (placa #${legajo}) desde la web.`,
  );

  revalidatePath("/dashboard/empleados");
}

/** Inhabilita (o reactiva) una cuenta de forma permanente. */
export async function alternarActivoEmpleado(formData: FormData) {
  const admin = await requireGestionEmpleados();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("Empleado no encontrado");

  const nuevoActivo = !user.activo;
  await prisma.user.update({
    where: { id },
    data: { activo: nuevoActivo, suspendidoHasta: nuevoActivo ? user.suspendidoHasta : null },
  });

  await notificarDiscord(
    user.discordId,
    nuevoActivo
      ? `✅ Tu cuenta ha sido reactivada en el Departamento de Justicia.`
      : `⛔ Tu cuenta ha sido inhabilitada permanentemente en el Departamento de Justicia.`,
  );
  await enviarLogDiscord(
    prisma,
    "empleados",
    `${nuevoActivo ? "✅ Reactivada" : "⛔ Inhabilitada permanentemente"}: **${user.nombre} ${user.apellidos}** por ${admin.nombre} ${admin.apellidos}.`,
  );

  revalidatePath("/dashboard/empleados");
}

/** Inhabilita temporalmente una cuenta durante `dias` días (la cuenta se reactiva sola al pasar la fecha). */
export async function suspenderEmpleadoTemporal(formData: FormData) {
  const admin = await requireGestionEmpleados();
  const id = String(formData.get("id") ?? "");
  const dias = Number(formData.get("dias") ?? 0);
  if (!id || !dias || dias <= 0) throw new Error("Datos incompletos o inválidos");

  const user = await prisma.user.findUniqueOrThrow({ where: { id } });
  const hasta = new Date(Date.now() + dias * 86400000);

  await prisma.user.update({ where: { id }, data: { suspendidoHasta: hasta } });

  await notificarDiscord(
    user.discordId,
    `⏸️ Tu cuenta ha sido inhabilitada temporalmente hasta el ${hasta.toLocaleDateString("es-ES")}.`,
  );
  await enviarLogDiscord(
    prisma,
    "empleados",
    `⏸️ **${user.nombre} ${user.apellidos}** suspendido hasta el ${hasta.toLocaleDateString("es-ES")} por ${admin.nombre} ${admin.apellidos}.`,
  );

  revalidatePath("/dashboard/empleados");
}

export async function quitarSuspensionEmpleado(formData: FormData) {
  await requireGestionEmpleados();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  await prisma.user.update({ where: { id }, data: { suspendidoHasta: null } });
  revalidatePath("/dashboard/empleados");
}

export async function cambiarRangoEmpleado(formData: FormData) {
  const admin = await requireGestionEmpleados();
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  if (!id || !STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number]) || role === "JUEZ_SUPREMO") {
    throw new Error("Datos incompletos o inválidos");
  }

  const empleado = await prisma.user.findUniqueOrThrow({ where: { id } });
  if (empleado.role === role) return;

  await prisma.user.update({ where: { id }, data: { role } });

  await sincronizarMiembroDiscord(empleado.discordId, role);

  await notificarDiscord(
    empleado.discordId,
    `🏛️ Tu rango en el Departamento de Justicia ha cambiado a **${ROLE_LABELS[role]}**.`,
  );
  await enviarLogDiscord(
    prisma,
    "empleados",
    `🔄 **${empleado.nombre} ${empleado.apellidos}** pasó de **${ROLE_LABELS[empleado.role]}** a **${ROLE_LABELS[role]}** (cambiado por ${admin.nombre} ${admin.apellidos}).`,
  );

  revalidatePath("/dashboard/empleados");
}

export async function cambiarLegajoEmpleado(formData: FormData) {
  const admin = await requireGestionEmpleados();
  const id = String(formData.get("id") ?? "");
  const legajo = String(formData.get("legajo") ?? "").trim();
  if (!id || !legajo) throw new Error("Datos incompletos");

  const existente = await prisma.user.findUnique({ where: { legajo } });
  if (existente && existente.id !== id) throw new Error("Ya existe otro empleado con esa placa");

  const empleado = await prisma.user.update({ where: { id }, data: { legajo } });

  await sincronizarMiembroDiscord(empleado.discordId, empleado.role, `${empleado.nombre} ${empleado.apellidos} - #${legajo}`);
  await enviarLogDiscord(
    prisma,
    "empleados",
    `🔢 Placa de **${empleado.nombre} ${empleado.apellidos}** cambiada a #${legajo} por ${admin.nombre} ${admin.apellidos}.`,
  );

  revalidatePath("/dashboard/empleados");
}

/** Crea un contrato laboral para un empleado que se quedó sin uno (p. ej. por un fallo al contratarlo). */
export async function asignarContratoEmpleado(formData: FormData) {
  await requireGestionEmpleados();
  const id = String(formData.get("id") ?? "");
  const puesto = String(formData.get("puesto") ?? "").trim();
  if (!id) throw new Error("Datos incompletos");

  const empleado = await prisma.user.findUniqueOrThrow({ where: { id } });

  await prisma.contratoLaboral.create({
    data: {
      userId: id,
      puesto: puesto || ROLE_LABELS[empleado.role],
      salarioBase: await tarifaHoraDe(prisma, id),
    },
  });
  await crearNominaInicial(prisma, id);

  await notificarDiscord(
    empleado.discordId,
    `📄 Se te ha asignado un contrato laboral pendiente de firma en el portal.`,
  );

  revalidatePath("/dashboard/empleados");
  revalidatePath("/dashboard/mi-contrato");
}

/** Genera una contraseña nueva y se la envía por Discord (nunca se muestra en la web). */
export async function resetearPasswordEmpleado(formData: FormData) {
  const admin = await requireGestionEmpleados();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  const empleado = await prisma.user.findUniqueOrThrow({ where: { id } });
  if (!empleado.discordId) {
    throw new Error("Este empleado no tiene Discord vinculado; pídele que lo configure primero.");
  }

  const nuevaPassword = generarPasswordTemporal();
  await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(nuevaPassword, 10) } });

  await notificarDiscord(
    empleado.discordId,
    `🔐 Tu contraseña ha sido restablecida por ${admin.nombre} ${admin.apellidos}. Nueva contraseña temporal: \`${nuevaPassword}\`\nCámbiala desde Configuración en cuanto entres.`,
  );
  await enviarLogDiscord(
    prisma,
    "empleados",
    `🔐 Contraseña restablecida para **${empleado.nombre} ${empleado.apellidos}** por ${admin.nombre} ${admin.apellidos}.`,
  );

  revalidatePath("/dashboard/empleados");
}

export async function subirFotoEmpleado(formData: FormData) {
  await requireGestionEmpleados();
  const id = String(formData.get("id") ?? "");
  const foto = formData.get("foto");
  if (!id || !(foto instanceof File) || foto.size === 0) throw new Error("Datos incompletos");

  await prisma.user.findUniqueOrThrow({ where: { id } });

  const avatarUrl = await guardarAvatar(foto, id);
  await prisma.user.update({ where: { id }, data: { avatarUrl } });

  revalidatePath("/dashboard/empleados");
  revalidatePath("/dashboard");
}

/**
 * Elimina definitivamente la cuenta y sus datos de nómina/fichaje/faltas.
 * Si el empleado tiene expedientes, audiencias, contratos u otros registros
 * institucionales a su nombre, la operación falla (usa "Inhabilitar" en su lugar).
 */
export async function eliminarEmpleado(formData: FormData) {
  const admin = await requireGestionEmpleados();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  const empleado = await prisma.user.findUniqueOrThrow({ where: { id } });

  try {
    await prisma.$transaction([
      prisma.ajusteFichaje.deleteMany({ where: { userId: id } }),
      prisma.fichaje.deleteMany({ where: { userId: id } }),
      prisma.nomina.deleteMany({ where: { userId: id } }),
      prisma.contratoLaboral.deleteMany({ where: { userId: id } }),
      prisma.plus.deleteMany({ where: { userId: id } }),
      prisma.medallaProgreso.deleteMany({ where: { userId: id } }),
      prisma.examen.deleteMany({ where: { empleadoId: id } }),
      prisma.solicitudFalta.deleteMany({ where: { reportadoId: id } }),
      prisma.falta.deleteMany({ where: { empleadoId: id } }),
      prisma.postulacion.deleteMany({ where: { candidatoId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);
  } catch {
    throw new Error(
      "No se puede eliminar: tiene expedientes, audiencias, informes u otros registros a su nombre. Usa 'Inhabilitar' en su lugar.",
    );
  }

  await enviarLogDiscord(
    prisma,
    "empleados",
    `🗑️ **${empleado.nombre} ${empleado.apellidos}** (${ROLE_LABELS[empleado.role]}) eliminado permanentemente por ${admin.nombre} ${admin.apellidos}.`,
  );

  revalidatePath("/dashboard/empleados");
}

export async function ajustarHorasEmpleado(formData: FormData) {
  const admin = await requirePermiso("GESTIONAR_NOMINAS");
  const userId = String(formData.get("userId") ?? "");
  const minutos = Number(formData.get("minutos") ?? 0);
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!userId || !minutos || !motivo) throw new Error("Datos incompletos");

  const empleado = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  await prisma.ajusteFichaje.create({ data: { userId, minutos, motivo, autorId: admin.id } });

  const horas = (Math.abs(minutos) / 60).toFixed(1);
  await notificarDiscord(
    empleado.discordId,
    `🕒 Se te han ${minutos > 0 ? "añadido" : "restado"} **${horas}h** de servicio: ${motivo}`,
  );
  await enviarLogDiscord(
    prisma,
    "fichajes",
    `🕒 ${minutos > 0 ? "+" : ""}${minutos}min a **${empleado.nombre} ${empleado.apellidos}** por ${admin.nombre} ${admin.apellidos}: ${motivo}`,
  );

  revalidatePath("/dashboard/fichaje");
  revalidatePath("/dashboard/nominas");
}

export async function imponerFalta(formData: FormData) {
  const admin = await requirePermiso("GESTIONAR_FALTAS");

  const empleadoId = String(formData.get("empleadoId") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  const gravedad = String(formData.get("gravedad") ?? "LEVE") as Gravedad;
  if (!empleadoId || !motivo) throw new Error("Datos incompletos");

  const empleado = await prisma.user.findUniqueOrThrow({ where: { id: empleadoId } });
  await prisma.falta.create({
    data: { empleadoId, motivo, gravedad, autorId: admin.id },
  });

  await notificarDiscord(
    empleado.discordId,
    `⚠️ Se te ha impuesto una falta: **${motivo}**. Revísala y reconócela desde el portal (Faltas).`,
  );
  await enviarLogDiscord(
    prisma,
    "faltas",
    `⚠️ Falta impuesta a **${empleado.nombre} ${empleado.apellidos}** por ${admin.nombre} ${admin.apellidos}: ${motivo}`,
  );

  revalidatePath("/dashboard/empleados");
  revalidatePath("/dashboard");
}

export async function reconocerFalta(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Datos incompletos");

  const falta = await prisma.falta.findUnique({ where: { id } });
  if (!falta || falta.empleadoId !== session.user.id) throw new Error("No autorizado");

  await prisma.falta.update({ where: { id }, data: { estado: "RECONOCIDA" } });

  revalidatePath("/dashboard/faltas");
  revalidatePath("/dashboard");
}
