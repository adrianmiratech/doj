import { PrismaClient } from "../generated/prisma/client";
import type { Role } from "../generated/prisma/enums";
import { STAFF_ROLES, TARIFA_HORA_MINIMA } from "./labels";
import {
  etiquetaSemana,
  inicioSemanaActual,
  finSemanaActual,
  inicioSemanaAnterior,
  finSemanaAnterior,
} from "./semanas";
import { notificarDiscord } from "./discord-notify";

type PrismaLike = Pick<
  InstanceType<typeof PrismaClient>,
  "user" | "fichaje" | "nomina" | "contratoLaboral" | "tarifaRango" | "ajusteFichaje"
>;

/** El sueldo va por rango (no por persona): lee la tarifa/hora configurada para el rango ACTUAL del empleado. */
export async function tarifaHoraDe(prisma: PrismaLike, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return TARIFA_HORA_MINIMA;
  const tarifaRango = await prisma.tarifaRango.findUnique({ where: { role: user.role } });
  return Math.max(TARIFA_HORA_MINIMA, tarifaRango?.tarifaHora ?? TARIFA_HORA_MINIMA);
}

async function horasEnRango(prisma: PrismaLike, userId: string, desde: Date, hasta: Date) {
  const [fichajes, ajustes] = await Promise.all([
    prisma.fichaje.findMany({ where: { userId, entrada: { gte: desde, lt: hasta } } }),
    prisma.ajusteFichaje.findMany({ where: { userId, createdAt: { gte: desde, lt: hasta } } }),
  ]);
  const msFichados = fichajes.reduce((acc, f) => {
    const fin = f.salida ?? hasta;
    return acc + (fin.getTime() - f.entrada.getTime());
  }, 0);
  const msAjuste = ajustes.reduce((acc, a) => acc + a.minutos * 60000, 0);
  return Math.max(0, (msFichados + msAjuste) / 3600000);
}

/**
 * Cierra la nomina de la semana anterior (calcula el importe real segun las
 * horas fichadas y la tarifa/hora de cada empleado) y abre una nueva nomina
 * en $0 para la semana en curso. Pensado para ejecutarse una vez por semana
 * (o manualmente); es seguro llamarlo varias veces, no duplica nominas.
 */
export async function cerrarSemanaYGenerarNuevas(prisma: PrismaLike) {
  const empleados = await prisma.user.findMany({
    where: { role: { in: STAFF_ROLES as unknown as Role[] }, activo: true },
  });

  const semanaAnterior = etiquetaSemana(inicioSemanaAnterior());
  const semanaActual = etiquetaSemana(new Date());

  for (const empleado of empleados) {
    const tarifa = await tarifaHoraDe(prisma, empleado.id);

    const nominaAnterior = await prisma.nomina.findFirst({
      where: { userId: empleado.id, periodo: semanaAnterior },
    });
    if (nominaAnterior && !nominaAnterior.pagada) {
      const horas = await horasEnRango(prisma, empleado.id, inicioSemanaAnterior(), finSemanaAnterior());
      const importe = Math.round(horas * tarifa);
      await prisma.nomina.update({
        where: { id: nominaAnterior.id },
        data: {
          importe,
          horas,
          tarifa,
          detalle: `${horas.toFixed(1)}h fichadas × $${tarifa}/h`,
        },
      });
      await notificarDiscord(
        empleado.discordId,
        `💰 Tu nómina de **${semanaAnterior}** ya está calculada: $${importe.toLocaleString("es-ES")} (${horas.toFixed(1)}h × $${tarifa}/h). Confírmala en el portal (Nóminas).`,
      );
    }

    const nominaActual = await prisma.nomina.findFirst({
      where: { userId: empleado.id, periodo: semanaActual },
    });
    if (!nominaActual) {
      const numeroSemana = (await prisma.nomina.count({ where: { userId: empleado.id } })) + 1;
      await prisma.nomina.create({
        data: {
          userId: empleado.id,
          periodo: semanaActual,
          numeroSemana,
          inicio: inicioSemanaActual(),
          fin: finSemanaActual(),
          tarifa,
          importe: 0,
        },
      });
    }
  }
}

/** Crea la primera nomina (semana actual, $0) para un empleado recien contratado. */
export async function crearNominaInicial(prisma: PrismaLike, userId: string) {
  const periodo = etiquetaSemana(new Date());
  const existente = await prisma.nomina.findFirst({ where: { userId, periodo } });
  if (existente) return;
  const numeroSemana = (await prisma.nomina.count({ where: { userId } })) + 1;
  const tarifa = await tarifaHoraDe(prisma, userId);
  await prisma.nomina.create({
    data: {
      userId,
      periodo,
      numeroSemana,
      inicio: inicioSemanaActual(),
      fin: finSemanaActual(),
      tarifa,
      importe: 0,
    },
  });
}

/**
 * Recalcula en vivo la nomina de la semana en curso (aun no cerrada) segun
 * las horas fichadas/ajustadas hasta este momento. Se llama al abrir la
 * pagina de Nominas, para que el importe se vaya actualizando durante la
 * semana en vez de quedarse en $0 hasta el cierre del lunes.
 */
export async function actualizarNominaEnCurso(prisma: PrismaLike, userId: string) {
  const periodo = etiquetaSemana(new Date());
  const nomina = await prisma.nomina.findFirst({ where: { userId, periodo } });
  if (!nomina || nomina.pagada || nomina.acordada) return;

  const tarifa = await tarifaHoraDe(prisma, userId);
  const horas = await horasEnRango(prisma, userId, inicioSemanaActual(), new Date());
  const importe = Math.round(horas * tarifa);

  if (horas === nomina.horas && tarifa === nomina.tarifa) return;

  await prisma.nomina.update({
    where: { id: nomina.id },
    data: { horas, tarifa, importe, detalle: `${horas.toFixed(1)}h fichadas × $${tarifa}/h (semana en curso)` },
  });
}
