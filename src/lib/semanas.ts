export function numeroSemanaISO(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function etiquetaSemana(date: Date) {
  return `Semana ${numeroSemanaISO(date)} · ${date.getFullYear()}`;
}

function inicioSemanaDe(date: Date) {
  const now = new Date(date);
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function inicioSemanaAnterior() {
  const inicioActual = inicioSemanaDe(new Date());
  const inicioAnterior = new Date(inicioActual);
  inicioAnterior.setDate(inicioActual.getDate() - 7);
  return inicioAnterior;
}

export function finSemanaAnterior() {
  return inicioSemanaDe(new Date());
}

export function inicioSemanaActual() {
  return inicioSemanaDe(new Date());
}

export function finSemanaActual() {
  const fin = new Date(inicioSemanaDe(new Date()));
  fin.setDate(fin.getDate() + 7);
  return fin;
}

export function formatRangoFechas(inicio: Date, fin: Date) {
  const finInclusive = new Date(fin);
  finInclusive.setDate(finInclusive.getDate() - 1);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const inicioStr = inicio.toLocaleDateString("es-ES", opts);
  const finStr = finInclusive.toLocaleDateString("es-ES", { ...opts, year: "numeric" });
  return `${inicioStr} – ${finStr}`;
}

/** Devuelve las últimas `cantidad` semanas como {value, label}: value es la clave interna
 * ("Semana 35 · 2026"), label incluye el rango de fechas para saber a qué semana corresponde. */
export function opcionesSemanas(cantidad = 6) {
  const opciones: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < cantidad; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const inicio = inicioSemanaDe(d);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 7);
    opciones.push({ value: etiquetaSemana(d), label: `${etiquetaSemana(d)} (${formatRangoFechas(inicio, fin)})` });
  }
  return opciones;
}
