"use client";

import { useRef } from "react";
import { X, ShieldAlert, Inbox } from "lucide-react";
import { crearSolicitudFalta } from "@/lib/actions/solicitudes-falta";
import { StatusBadge } from "@/components/status-badge";
import { ESTADO_SOLICITUD_COLORS, ESTADO_SOLICITUD_LABELS } from "@/lib/labels";

type Agente = { id: string; nombre: string; apellidos: string };
type MiSolicitud = {
  id: string;
  titulo: string;
  estado: string;
  createdAt: Date;
  reportado: { nombre: string; apellidos: string };
};

const SEVERIDADES = [
  { label: "Baja", value: "LEVE" },
  { label: "Media", value: "GRAVE" },
  { label: "Alta", value: "MUY_GRAVE" },
] as const;

export function SolicitarFaltaDialog({ agentes }: { agentes: Agente[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        onClick={() => dialogRef.current?.showModal()}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
      >
        + Solicitar Falta
      </button>

      <dialog
        ref={dialogRef}
        className="rounded-lg border border-border bg-surface p-0 w-full max-w-md text-text backdrop:bg-black/60"
      >
        <form action={crearSolicitudFalta} onSubmit={() => dialogRef.current?.close()} encType="multipart/form-data">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
            <ShieldAlert className="h-4 w-4 text-accent" />
            <div className="flex-1">
              <h2 className="text-sm font-semibold">Nueva Solicitud de Falta</h2>
              <p className="text-xs text-text-muted">Reporta la falta de un agente y adjunta las evidencias</p>
            </div>
            <button type="button" onClick={() => dialogRef.current?.close()} className="text-text-muted hover:text-text">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">
                Agente reportado *
              </label>
              <select
                name="reportadoId"
                required
                defaultValue=""
                className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="" disabled>
                  Selecciona un agente
                </option>
                {agentes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} {a.apellidos}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">
                Título de la falta *
              </label>
              <input
                name="titulo"
                required
                placeholder="Ej: Ausencia sin justificar"
                className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Descripción</label>
              <textarea
                name="descripcion"
                rows={3}
                placeholder="Detalla lo ocurrido…"
                className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">
                Severidad sugerida
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SEVERIDADES.map((s, i) => (
                  <label
                    key={s.value}
                    className="flex items-center justify-center rounded-md border border-border bg-surface-2 py-2 text-sm cursor-pointer has-[:checked]:border-accent has-[:checked]:text-accent has-[:checked]:bg-accent/10"
                  >
                    <input
                      type="radio"
                      name="gravedad"
                      value={s.value}
                      defaultChecked={i === 1}
                      className="sr-only"
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">
                Evidencias (archivo o enlace)
              </label>
              <input
                name="evidenciasArchivo"
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className="w-full text-xs text-text-muted file:mr-2 file:rounded-md file:border file:border-border file:bg-surface-2 file:px-2.5 file:py-1.5 file:text-xs file:font-medium mb-2"
              />
              <input
                name="evidencias"
                placeholder="…o pegar un enlace (Streamable, Imgur, etc.)"
                className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface-2 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
            >
              Enviar solicitud
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function MisSolicitudesDialog({ solicitudes }: { solicitudes: MiSolicitud[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const total = solicitudes.length;
  const pendientes = solicitudes.filter((s) => s.estado === "PENDIENTE").length;
  const enRevision = solicitudes.filter((s) => s.estado === "EN_REVISION").length;
  const aprobadas = solicitudes.filter((s) => s.estado === "APROBADA").length;
  const rechazadas = solicitudes.filter((s) => s.estado === "RECHAZADA").length;

  return (
    <>
      <button
        onClick={() => dialogRef.current?.showModal()}
        className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface-2 transition-colors"
      >
        Mis Solicitudes
      </button>

      <dialog
        ref={dialogRef}
        className="rounded-lg border border-border bg-surface p-0 w-full max-w-lg text-text backdrop:bg-black/60"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">Mis Solicitudes de Falta</h2>
            <p className="text-xs text-text-muted">Historial de las solicitudes de falta que has enviado.</p>
          </div>
          <button onClick={() => dialogRef.current?.close()} className="text-text-muted hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-5 gap-2 text-center">
            <Stat label="Total" value={total} />
            <Stat label="Pendientes" value={pendientes} className="text-warning" />
            <Stat label="En Revisión" value={enRevision} className="text-info" />
            <Stat label="Aprobadas" value={aprobadas} className="text-success" />
            <Stat label="Rechazadas" value={rechazadas} className="text-danger" />
          </div>

          <div className="rounded-lg border border-border">
            {solicitudes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Inbox className="h-8 w-8 text-text-muted" />
                <p className="text-sm font-medium">No has enviado solicitudes</p>
                <p className="text-xs text-text-muted">Usa &quot;Nueva Solicitud&quot; para reportar una falta</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {solicitudes.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{s.titulo}</p>
                      <p className="text-xs text-text-muted">
                        {s.reportado.nombre} {s.reportado.apellidos} · {new Date(s.createdAt).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                    <StatusBadge label={ESTADO_SOLICITUD_LABELS[s.estado]} className={ESTADO_SOLICITUD_COLORS[s.estado]} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-md border border-border bg-surface-2 py-2.5">
      <p className={`text-lg font-semibold ${className}`}>{value}</p>
      <p className="text-[10px] text-text-muted uppercase tracking-wide">{label}</p>
    </div>
  );
}
