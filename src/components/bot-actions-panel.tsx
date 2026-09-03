"use client";

import { useRef, useState, useTransition } from "react";
import { Send, MessageCircle, Gavel } from "lucide-react";
import { enviarMensajeCanalAction, enviarMensajeDirectoAction, accionModeracionAction } from "@/lib/actions/bot-control";
import type { CanalTexto } from "@/lib/discord-control";

type Resultado = { ok: boolean; error?: string };

const ACCIONES_MODERACION = [
  { value: "silenciar_10m", label: "Silenciar 10 minutos" },
  { value: "silenciar_1h", label: "Silenciar 1 hora" },
  { value: "silenciar_1d", label: "Silenciar 1 día" },
  { value: "quitar_silencio", label: "Quitar silencio" },
  { value: "expulsar", label: "Expulsar del servidor" },
  { value: "banear", label: "Banear" },
  { value: "desbanear", label: "Quitar baneo" },
];

function Feedback({ resultado }: { resultado: Resultado | null }) {
  if (!resultado) return null;
  if (resultado.ok) return <p className="text-xs text-success">Hecho.</p>;
  return <p className="text-xs text-danger break-all">{resultado.error ?? "Ocurrió un error"}</p>;
}

export function BotActionsPanel({ canales }: { canales: CanalTexto[] }) {
  const [pendingCanal, startCanal] = useTransition();
  const [pendingDm, startDm] = useTransition();
  const [pendingMod, startMod] = useTransition();
  const [resCanal, setResCanal] = useState<Resultado | null>(null);
  const [resDm, setResDm] = useState<Resultado | null>(null);
  const [resMod, setResMod] = useState<Resultado | null>(null);
  const formCanal = useRef<HTMLFormElement>(null);
  const formDm = useRef<HTMLFormElement>(null);
  const formMod = useRef<HTMLFormElement>(null);

  return (
    <div className="rounded-lg border border-border bg-surface p-5 space-y-5">
      <div>
        <h2 className="text-sm font-semibold mb-1">Acciones en nombre del bot</h2>
        <p className="text-xs text-text-muted">
          Enviá mensajes o tomá acciones de moderación en el servidor de Discord directamente desde acá, sin
          necesitar Discord abierto. Todo queda registrado en el canal de logs.
        </p>
      </div>

      {/* Mensaje a un canal */}
      <div className="rounded-md border border-border bg-surface-2 p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
          <Send className="h-3.5 w-3.5" /> Enviar mensaje a un canal
        </p>
        <form
          ref={formCanal}
          action={(fd) =>
            startCanal(async () => {
              const r = await enviarMensajeCanalAction(fd);
              setResCanal(r);
              if (r.ok) formCanal.current?.reset();
            })
          }
          className="space-y-2"
        >
          <select
            name="channelId"
            required
            disabled={canales.length === 0}
            className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
          >
            <option value="">{canales.length === 0 ? "No se pudo cargar la lista de canales" : "Elegí un canal…"}</option>
            {canales.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.name}
              </option>
            ))}
          </select>
          <textarea
            name="mensaje"
            required
            rows={2}
            placeholder="Mensaje a publicar…"
            className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={pendingCanal || canales.length === 0}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover transition-colors disabled:opacity-60"
            >
              {pendingCanal ? "Enviando…" : "Enviar"}
            </button>
            <Feedback resultado={resCanal} />
          </div>
        </form>
      </div>

      {/* DM directo */}
      <div className="rounded-md border border-border bg-surface-2 p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
          <MessageCircle className="h-3.5 w-3.5" /> Enviar mensaje directo (DM)
        </p>
        <form
          ref={formDm}
          action={(fd) =>
            startDm(async () => {
              const r = await enviarMensajeDirectoAction(fd);
              setResDm(r);
              if (r.ok) formDm.current?.reset();
            })
          }
          className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2"
        >
          <input
            name="discordId"
            required
            placeholder="ID de Discord"
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent font-mono"
          />
          <input
            name="mensaje"
            required
            placeholder="Mensaje…"
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
          />
          <div className="sm:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={pendingDm}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover transition-colors disabled:opacity-60"
            >
              {pendingDm ? "Enviando…" : "Enviar DM"}
            </button>
            <Feedback resultado={resDm} />
          </div>
        </form>
      </div>

      {/* Moderación */}
      <div className="rounded-md border border-border bg-surface-2 p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
          <Gavel className="h-3.5 w-3.5" /> Moderación de un miembro
        </p>
        <form
          ref={formMod}
          action={(fd) =>
            startMod(async () => {
              const r = await accionModeracionAction(fd);
              setResMod(r);
              if (r.ok) formMod.current?.reset();
            })
          }
          className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-2"
        >
          <input
            name="discordId"
            required
            placeholder="ID de Discord del miembro"
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent font-mono"
          />
          <select
            name="accion"
            required
            defaultValue=""
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
          >
            <option value="" disabled>
              Elegí una acción…
            </option>
            {ACCIONES_MODERACION.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
          <input
            name="motivo"
            placeholder="Motivo (opcional)"
            className="sm:col-span-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
          />
          <div className="sm:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={pendingMod}
              className="rounded-md border border-danger/30 text-danger px-3 py-1.5 text-xs font-medium hover:bg-danger/10 transition-colors disabled:opacity-60"
            >
              {pendingMod ? "Aplicando…" : "Aplicar"}
            </button>
            <Feedback resultado={resMod} />
          </div>
        </form>
      </div>
    </div>
  );
}
