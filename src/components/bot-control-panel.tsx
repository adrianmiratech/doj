"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Power, PowerOff, TerminalSquare } from "lucide-react";
import { reiniciarBotAction } from "@/lib/actions/seguridad";
import type { EstadoBot, LineaLog } from "@/lib/northflank";

export function BotControlPanel({ estado, logs }: { estado: EstadoBot; logs: LineaLog[] }) {
  const [pending, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarLogs, setMostrarLogs] = useState(false);

  function reiniciar() {
    setError(null);
    startTransition(async () => {
      const resultado = await reiniciarBotAction();
      if (!resultado.ok) setError(resultado.error ?? "No se pudo reiniciar el bot");
      setConfirmando(false);
    });
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold mb-1">Control del bot</h2>
          {!estado.disponible ? (
            <p className="text-xs text-text-muted">
              No está configurado el acceso a Northflank (faltan variables de entorno).
            </p>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              {estado.corriendo ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/15 text-success px-2.5 py-0.5 font-medium">
                  <Power className="h-3 w-3" /> En línea
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger/15 text-danger px-2.5 py-0.5 font-medium">
                  <PowerOff className="h-3 w-3" /> Caído
                </span>
              )}
              {estado.deployedSha && (
                <span className="text-text-muted font-mono">commit {estado.deployedSha}</span>
              )}
            </div>
          )}
        </div>

        {estado.disponible && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMostrarLogs((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2 transition-colors"
            >
              <TerminalSquare className="h-3.5 w-3.5" />
              {mostrarLogs ? "Ocultar logs" : "Ver logs"}
            </button>
            {confirmando ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">¿Reiniciar el bot?</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={reiniciar}
                  className="rounded-md bg-danger px-3 py-1.5 text-xs font-medium text-white hover:bg-danger/90 transition-colors disabled:opacity-60"
                >
                  {pending ? "Reiniciando…" : "Sí, reiniciar"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirmando(false)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmando(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-danger/30 text-danger px-3 py-1.5 text-xs font-medium hover:bg-danger/10 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reiniciar bot
              </button>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      {mostrarLogs && (
        <div className="rounded-md border border-border bg-[#0b0f14] text-[#c9d1d9] p-3 max-h-80 overflow-y-auto font-mono text-[11px] leading-relaxed">
          {logs.length === 0 ? (
            <p className="text-text-muted">No hay logs disponibles.</p>
          ) : (
            logs.map((l, i) => (
              <p key={i} className="whitespace-pre-wrap break-all">
                <span className="text-[#6e7681]">{new Date(l.ts).toLocaleTimeString("es-ES")}</span> {l.log}
              </p>
            ))
          )}
        </div>
      )}
    </div>
  );
}
