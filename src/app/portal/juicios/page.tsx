import { Gavel, CalendarClock } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { ESTADO_CASO_COLORS, ESTADO_CASO_LABELS } from "@/lib/labels";

export default async function JuiciosPage() {
  const session = await auth();
  const userId = session!.user.id;

  const misCasos = await prisma.casoParte.findMany({
    where: { userId },
    include: {
      caso: {
        include: {
          audiencias: { include: { juez: true }, orderBy: { fecha: "asc" } },
        },
      },
    },
  });

  const ahora = new Date();
  const juiciosPendientes = misCasos.flatMap((p) =>
    p.caso.audiencias
      .filter((a) => a.fecha >= ahora)
      .map((a) => ({ audiencia: a, caso: p.caso, rol: p.rol })),
  );
  const resoluciones = misCasos.filter((p) => p.caso.estado === "CERRADO" || p.caso.estado === "ARCHIVADO");
  const casosActivos = misCasos.filter(
    (p) => p.caso.estado !== "CERRADO" && p.caso.estado !== "ARCHIVADO",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Mis Juicios y Casos</h1>
        <p className="text-sm text-text-muted">Expedientes judiciales en los que estás involucrado.</p>
      </div>

      <div className="rounded-lg border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
          <CalendarClock className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold">Juicios pendientes</h2>
        </div>
        <ul className="divide-y divide-border">
          {juiciosPendientes.length === 0 && (
            <li className="px-5 py-6 text-sm text-text-muted text-center">No tienes audiencias próximas.</li>
          )}
          {juiciosPendientes.map(({ audiencia, caso, rol }) => (
            <li key={audiencia.id} className="px-5 py-3">
              <p className="text-sm font-medium">{caso.titulo}</p>
              <p className="text-xs text-text-muted">
                {new Date(audiencia.fecha).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })} ·{" "}
                {audiencia.lugar} · Juez {audiencia.juez.nombre} {audiencia.juez.apellidos} · Tu rol: {rol}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
          <Gavel className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold">Casos activos</h2>
        </div>
        <ul className="divide-y divide-border">
          {casosActivos.length === 0 && (
            <li className="px-5 py-6 text-sm text-text-muted text-center">No tienes casos activos.</li>
          )}
          {casosActivos.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium">{p.caso.titulo}</p>
                <p className="text-xs text-text-muted">
                  {p.caso.expediente} · {p.caso.tipo} · Tu rol: {p.rol}
                </p>
              </div>
              <StatusBadge label={ESTADO_CASO_LABELS[p.caso.estado]} className={ESTADO_CASO_COLORS[p.caso.estado]} />
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold">Resoluciones</h2>
        </div>
        <ul className="divide-y divide-border">
          {resoluciones.length === 0 && (
            <li className="px-5 py-6 text-sm text-text-muted text-center">No tienes casos resueltos todavía.</li>
          )}
          {resoluciones.map((p) => (
            <li key={p.id} className="px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{p.caso.titulo}</p>
                <StatusBadge label={ESTADO_CASO_LABELS[p.caso.estado]} className={ESTADO_CASO_COLORS[p.caso.estado]} />
              </div>
              <p className="text-xs text-text-muted mt-1">
                {p.caso.expediente} · Tu rol: {p.rol}
              </p>
              <p className="text-sm mt-2">{p.caso.descripcion}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
