import { ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import {
  ESTADO_FALTA_COLORS,
  ESTADO_FALTA_LABELS,
  ESTADO_SOLICITUD_COLORS,
  ESTADO_SOLICITUD_LABELS,
  GRAVEDAD_COLORS,
  GRAVEDAD_LABELS,
  STAFF_ROLES,
} from "@/lib/labels";
import { reconocerFalta } from "@/lib/actions/empleados";
import { aprobarSolicitudFalta, marcarEnRevision, rechazarSolicitudFalta } from "@/lib/actions/solicitudes-falta";
import { SolicitarFaltaDialog, MisSolicitudesDialog } from "./faltas-dialogs";
import type { Role } from "@/generated/prisma/enums";

export default async function FaltasPage() {
  const session = await auth();
  const user = session!.user;
  const esJuezSupremo = user.role === "JUEZ_SUPREMO";

  const [faltas, agentes, misSolicitudes, solicitudesPendientes] = await Promise.all([
    prisma.falta.findMany({
      where: { empleadoId: user.id },
      orderBy: { createdAt: "desc" },
      include: { autor: true },
    }),
    prisma.user.findMany({
      where: { role: { in: STAFF_ROLES as unknown as Role[] }, activo: true, id: { not: user.id } },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, apellidos: true },
    }),
    prisma.solicitudFalta.findMany({
      where: { autorId: user.id },
      orderBy: { createdAt: "desc" },
      include: { reportado: true },
    }),
    esJuezSupremo
      ? prisma.solicitudFalta.findMany({
          where: { estado: { in: ["PENDIENTE", "EN_REVISION"] } },
          orderBy: { createdAt: "asc" },
          include: { reportado: true, autor: true },
        })
      : Promise.resolve([]),
  ]);

  const total = faltas.length;
  const pendientes = faltas.filter((f) => f.estado === "PENDIENTE").length;
  const reconocidas = faltas.filter((f) => f.estado === "RECONOCIDA").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Faltas</h1>
          <p className="text-sm text-text-muted">Historial de faltas y sanciones.</p>
        </div>
        <div className="flex gap-2">
          <MisSolicitudesDialog solicitudes={misSolicitudes} />
          <SolicitarFaltaDialog agentes={agentes} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-semibold">{total}</p>
          <p className="text-xs text-text-muted">Total</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-semibold text-warning">{pendientes}</p>
          <p className="text-xs text-text-muted">Pendientes</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-semibold text-success">{reconocidas}</p>
          <p className="text-xs text-text-muted">Reconocidas</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface">
        {faltas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ShieldCheck className="h-10 w-10 text-success" />
            <p className="text-sm font-semibold">Sin faltas</p>
            <p className="text-xs text-text-muted">No tienes faltas registradas</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {faltas.map((f) => (
              <li key={f.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 mr-2 text-xs font-medium ${GRAVEDAD_COLORS[f.gravedad]}`}
                    >
                      {GRAVEDAD_LABELS[f.gravedad]}
                    </span>
                    <span className="text-sm">{f.motivo}</span>
                    <p className="text-xs text-text-muted mt-1">
                      Impuesta por {f.autor.nombre} {f.autor.apellidos} ·{" "}
                      {new Date(f.createdAt).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <StatusBadge label={ESTADO_FALTA_LABELS[f.estado]} className={ESTADO_FALTA_COLORS[f.estado]} />
                </div>
                {f.estado === "PENDIENTE" && (
                  <form action={reconocerFalta} className="mt-3">
                    <input type="hidden" name="id" value={f.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
                    >
                      Reconocer
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {esJuezSupremo && (
        <div className="space-y-3 border-t border-border pt-6">
          <h2 className="text-lg font-semibold">Solicitudes de falta pendientes de revisión (Juez Supremo)</h2>
          <div className="rounded-lg border border-border bg-surface divide-y divide-border">
            {solicitudesPendientes.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-text-muted">No hay solicitudes pendientes.</p>
            )}
            {solicitudesPendientes.map((s) => (
              <div key={s.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 mr-2 text-xs font-medium ${GRAVEDAD_COLORS[s.gravedad]}`}
                    >
                      {GRAVEDAD_LABELS[s.gravedad]}
                    </span>
                    <span className="text-sm font-medium">{s.titulo}</span>
                    <p className="text-xs text-text-muted mt-1">
                      Reportado: {s.reportado.nombre} {s.reportado.apellidos} · Por {s.autor.nombre}{" "}
                      {s.autor.apellidos} · {new Date(s.createdAt).toLocaleDateString("es-ES")}
                    </p>
                    {s.descripcion && <p className="text-sm mt-1">{s.descripcion}</p>}
                    {s.evidencias && (
                      <a href={s.evidencias} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline">
                        Ver evidencias
                      </a>
                    )}
                  </div>
                  <StatusBadge label={ESTADO_SOLICITUD_LABELS[s.estado]} className={ESTADO_SOLICITUD_COLORS[s.estado]} />
                </div>
                <div className="mt-3 flex gap-2">
                  <form action={aprobarSolicitudFalta}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-success px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                    >
                      Aprobar
                    </button>
                  </form>
                  {s.estado === "PENDIENTE" && (
                    <form action={marcarEnRevision}>
                      <input type="hidden" name="id" value={s.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2 transition-colors"
                      >
                        Poner en revisión
                      </button>
                    </form>
                  )}
                  <form action={rechazarSolicitudFalta}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2 transition-colors"
                    >
                      Rechazar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
