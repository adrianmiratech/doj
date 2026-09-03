import { JusticeBadge } from "@/components/justice-badge";
import { ROLE_LABELS, ROLE_TIER_LABELS, OBJETIVO_HORAS_SEMANA } from "@/lib/labels";
import { formatDuracion } from "@/lib/fichaje";

function ObjetivoRing({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, pct) / 100) * c;

  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="5" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
        {Math.min(100, pct)}%
      </span>
    </div>
  );
}

export function PlacaWidget({
  nombre,
  apellidos,
  role,
  legajo,
  activo,
  desde,
  horasSemanaMs,
  contratosPendientes,
  faltasActivas,
}: {
  nombre: string;
  apellidos: string;
  role: string;
  legajo: string | null;
  activo: boolean;
  desde: Date;
  horasSemanaMs: number;
  contratosPendientes: number;
  faltasActivas: number;
}) {
  const objetivoMs = OBJETIVO_HORAS_SEMANA * 3600000;
  const pct = Math.round((horasSemanaMs / objetivoMs) * 100);

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start gap-5">
        {legajo && <JusticeBadge legajo={legajo} />}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold">
              {nombre} {apellidos}
            </h1>
            <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
              {ROLE_TIER_LABELS[role]}
            </span>
          </div>
          <p className="text-sm text-text-muted flex items-center gap-1.5 mt-0.5">
            <span className={`h-1.5 w-1.5 rounded-full ${activo ? "bg-success" : "bg-text-muted"}`} />
            {ROLE_LABELS[role]} · {activo ? "Activo" : "Inactivo"}
          </p>

          <div className={`mt-4 grid grid-cols-1 gap-3 text-sm ${legajo ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            {legajo && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-text-muted">Placa</p>
                <p className="font-medium">#{legajo}</p>
              </div>
            )}
            <div>
              <p className="text-[11px] uppercase tracking-wide text-text-muted">Rango</p>
              <p className="font-medium">{ROLE_LABELS[role]}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-text-muted">Desde</p>
              <p className="font-medium">{desde.toLocaleDateString("es-ES")}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 ml-auto">
          <ObjetivoRing pct={pct} />
          <p className="text-[10px] uppercase tracking-wide text-text-muted">
            Objetivo {OBJETIVO_HORAS_SEMANA}h
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border pt-4">
        <div>
          <p className="text-2xl font-semibold">{formatDuracion(horasSemanaMs)}</p>
          <p className="text-xs text-text-muted">Horas esta semana</p>
        </div>
        <div>
          <p className="text-2xl font-semibold">{contratosPendientes}</p>
          <p className="text-xs text-text-muted">Contratos pendientes</p>
        </div>
        <div>
          <p className={`text-2xl font-semibold ${faltasActivas > 0 ? "text-danger" : ""}`}>{faltasActivas}</p>
          <p className="text-xs text-text-muted">Faltas activas</p>
        </div>
      </div>
    </div>
  );
}
