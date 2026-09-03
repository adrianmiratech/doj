export function formatDuracion(ms: number) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
}

export function inicioSemana() {
  const now = new Date();
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function horasSemanaMs(fichajes: { entrada: Date; salida: Date | null }[]) {
  const ahora = Date.now();
  return fichajes.reduce((acc, f) => {
    const fin = f.salida ? f.salida.getTime() : ahora;
    return acc + (fin - f.entrada.getTime());
  }, 0);
}
