export function formatUltimoAcceso(fecha: Date | null) {
  if (!fecha) return "Nunca";
  const d = new Date(fecha);
  const hoy = new Date();
  const esHoy = d.toDateString() === hoy.toDateString();
  const hora = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  if (esHoy) return `Hoy a las ${hora}`;
  return `${d.toLocaleDateString("es-ES")} a las ${hora}`;
}
