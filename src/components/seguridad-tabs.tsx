"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  MessageCircle,
  Gavel,
  Settings2,
  History,
  BarChart3,
  Search,
  Ban,
  Eraser,
  Lock,
  Unlock,
  Timer,
  Radio,
  CalendarClock,
  Users,
  Hash,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import {
  enviarMensajeCanalAction,
  enviarMensajeDirectoAction,
  accionModeracionAction,
  buscarMiembrosAction,
  purgarMensajesAction,
  bloquearCanalAction,
  cambiarSlowmodeAction,
  difusionMasivaAction,
} from "@/lib/actions/bot-control";
import { programarMensajeAction, cancelarMensajeProgramadoAction } from "@/lib/actions/mensajes-programados";
import { actualizarConfigSeguridadAction } from "@/lib/actions/config-seguridad";
import { agregarAlertaWhitelist, quitarAlertaWhitelist } from "@/lib/actions/seguridad";
import { ROLE_LABELS, ROLE_ORDER } from "@/lib/labels";
import type { CanalTexto, Baneado, EstadisticasServidor, MiembroBuscado } from "@/lib/discord-control";
import type { LineaHistorial } from "@/lib/discord-logs";

type Resultado = { ok: boolean; error?: string };

type MensajeProgramadoVM = { id: string; channelNombre: string; mensaje: string; enviarEn: string };
type WhitelistVM = { id: string; tipo: string; valor: string; nota: string | null };
type ConfigSeguridadVM = {
  escaneoActivo: boolean;
  ventanaRaidMs: number;
  umbralRaid: number;
  ventanaNukeMs: number;
  umbralNuke: number;
  ventanaSancionesMs: number;
  umbralSanciones: number;
  umbralBorradoMasivo: number;
};

type Props = {
  canales: CanalTexto[];
  baneados: Baneado[];
  estadisticas: EstadisticasServidor | null;
  configSeguridad: ConfigSeguridadVM;
  mensajesProgramados: MensajeProgramadoVM[];
  whitelist: WhitelistVM[];
  historial: LineaHistorial[];
};

const TABS = [
  { id: "mensajeria", label: "Mensajería", icon: Send },
  { id: "moderacion", label: "Moderación", icon: Gavel },
  { id: "automatizacion", label: "Automatización", icon: Settings2 },
  { id: "historial", label: "Historial", icon: History },
  { id: "servidor", label: "Servidor", icon: BarChart3 },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Feedback({ resultado }: { resultado: Resultado | null }) {
  if (!resultado) return null;
  if (resultado.ok) return <p className="text-xs text-success">Hecho.</p>;
  return <p className="text-xs text-danger break-all">{resultado.error ?? "Ocurrió un error"}</p>;
}

function Card({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-surface-2 p-4 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent";

export function SeguridadTabs(props: Props) {
  const [tab, setTab] = useState<TabId>("mensajeria");

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="flex flex-wrap border-b border-border bg-surface-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-accent text-accent bg-surface"
                : "border-transparent text-text-muted hover:text-text hover:bg-surface/60"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === "mensajeria" && <MensajeriaTab canales={props.canales} mensajesProgramados={props.mensajesProgramados} />}
        {tab === "moderacion" && <ModeracionTab canales={props.canales} baneados={props.baneados} />}
        {tab === "automatizacion" && (
          <AutomatizacionTab whitelist={props.whitelist} configSeguridad={props.configSeguridad} />
        )}
        {tab === "historial" && <HistorialTab historial={props.historial} />}
        {tab === "servidor" && <EstadisticasTab estadisticas={props.estadisticas} />}
      </div>
    </div>
  );
}

// ---------- Mensajería ----------

function MensajeriaTab({ canales, mensajesProgramados }: { canales: CanalTexto[]; mensajesProgramados: MensajeProgramadoVM[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <MensajeCanalCard canales={canales} />
      <MensajeDirectoCard />
      <DifusionMasivaCard />
      <MensajesProgramadosCard canales={canales} mensajesProgramados={mensajesProgramados} />
    </div>
  );
}

function MensajeCanalCard({ canales }: { canales: CanalTexto[] }) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<Resultado | null>(null);
  const form = useRef<HTMLFormElement>(null);

  return (
    <Card title="Enviar mensaje a un canal" icon={Send}>
      <form
        ref={form}
        action={(fd) => start(async () => {
          const r = await enviarMensajeCanalAction(fd);
          setRes(r);
          if (r.ok) form.current?.reset();
        })}
        className="space-y-2"
      >
        <select name="channelId" required disabled={canales.length === 0} className={inputCls}>
          <option value="">{canales.length === 0 ? "No se pudo cargar la lista de canales" : "Elegí un canal…"}</option>
          {canales.map((c) => (
            <option key={c.id} value={c.id}>
              #{c.name}
            </option>
          ))}
        </select>
        <textarea name="mensaje" required rows={2} placeholder="Mensaje a publicar…" className={inputCls} />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pending || canales.length === 0}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover transition-colors disabled:opacity-60"
          >
            {pending ? "Enviando…" : "Enviar"}
          </button>
          <Feedback resultado={res} />
        </div>
      </form>
    </Card>
  );
}

function MensajeDirectoCard() {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<Resultado | null>(null);
  const form = useRef<HTMLFormElement>(null);

  return (
    <Card title="Enviar mensaje directo (DM)" icon={MessageCircle}>
      <form
        ref={form}
        action={(fd) => start(async () => {
          const r = await enviarMensajeDirectoAction(fd);
          setRes(r);
          if (r.ok) form.current?.reset();
        })}
        className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2"
      >
        <input name="discordId" required placeholder="ID de Discord" className={`${inputCls} font-mono`} />
        <input name="mensaje" required placeholder="Mensaje…" className={inputCls} />
        <div className="sm:col-span-2 flex items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover transition-colors disabled:opacity-60"
          >
            {pending ? "Enviando…" : "Enviar DM"}
          </button>
          <Feedback resultado={res} />
        </div>
      </form>
    </Card>
  );
}

function DifusionMasivaCard() {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<(Resultado & { enviados?: number; fallidos?: number }) | null>(null);
  const form = useRef<HTMLFormElement>(null);

  return (
    <Card title="Difusión masiva por DM" icon={Radio}>
      <form
        ref={form}
        action={(fd) => start(async () => {
          const r = await difusionMasivaAction(fd);
          setRes(r);
          if (r.ok) form.current?.reset();
        })}
        className="space-y-2"
      >
        <select name="rango" className={inputCls} defaultValue="TODOS">
          <option value="TODOS">Todo el personal activo</option>
          {ROLE_ORDER.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <textarea name="mensaje" required rows={2} placeholder="Mensaje a difundir…" className={inputCls} />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover transition-colors disabled:opacity-60"
          >
            {pending ? "Enviando…" : "Difundir"}
          </button>
          {res?.ok && <p className="text-xs text-success">Entregados: {res.enviados} · Fallidos: {res.fallidos}</p>}
          {res && !res.ok && <Feedback resultado={res} />}
        </div>
      </form>
    </Card>
  );
}

function MensajesProgramadosCard({ canales, mensajesProgramados }: { canales: CanalTexto[]; mensajesProgramados: MensajeProgramadoVM[] }) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<Resultado | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <Card title="Mensajes programados" icon={CalendarClock}>
      <form
        ref={form}
        action={(fd) => {
          const select = form.current?.elements.namedItem("channelId") as HTMLSelectElement | null;
          const nombre = select?.selectedOptions[0]?.dataset.name ?? "";
          fd.set("channelNombre", nombre);
          start(async () => {
            const r = await programarMensajeAction(fd);
            setRes(r);
            if (r.ok) {
              form.current?.reset();
              router.refresh();
            }
          });
        }}
        className="space-y-2"
      >
        <select name="channelId" required disabled={canales.length === 0} className={inputCls}>
          <option value="">Elegí un canal…</option>
          {canales.map((c) => (
            <option key={c.id} value={c.id} data-name={c.name}>
              #{c.name}
            </option>
          ))}
        </select>
        <input name="enviarEn" type="datetime-local" required className={inputCls} />
        <textarea name="mensaje" required rows={2} placeholder="Mensaje a programar…" className={inputCls} />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pending || canales.length === 0}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover transition-colors disabled:opacity-60"
          >
            {pending ? "Programando…" : "Programar"}
          </button>
          <Feedback resultado={res} />
        </div>
      </form>

      {mensajesProgramados.length > 0 && (
        <ul className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
          {mensajesProgramados.map((m) => (
            <li key={m.id} className="flex items-start justify-between gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs">
              <span className="min-w-0">
                <span className="text-text-muted">#{m.channelNombre} · {new Date(m.enviarEn).toLocaleString("es-ES")}</span>
                <br />
                <span className="break-words">{m.mensaje}</span>
              </span>
              <form action={cancelarMensajeProgramadoAction}>
                <input type="hidden" name="id" value={m.id} />
                <button type="submit" className="text-danger hover:text-danger/80 shrink-0" title="Cancelar">
                  <X className="h-3.5 w-3.5" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ---------- Moderación ----------

function ModeracionTab({ canales, baneados }: { canales: CanalTexto[]; baneados: Baneado[] }) {
  const [idSeleccionado, setIdSeleccionado] = useState("");

  return (
    <div className="space-y-4">
      <BusquedaMiembroCard onSeleccionar={setIdSeleccionado} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ModeracionMiembroCard idPrefill={idSeleccionado} />
        <div className="space-y-4">
          <PurgarMensajesCard canales={canales} />
          <BloquearCanalCard canales={canales} />
          <SlowmodeCard canales={canales} />
        </div>
      </div>
      <BaneadosCard baneados={baneados} />
    </div>
  );
}

function BusquedaMiembroCard({ onSeleccionar }: { onSeleccionar: (id: string) => void }) {
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<MiembroBuscado[]>([]);

  function buscar(q: string) {
    setQuery(q);
    if (!q.trim()) {
      setResultados([]);
      return;
    }
    start(async () => {
      setResultados(await buscarMiembrosAction(q));
    });
  }

  return (
    <Card title="Buscar miembro" icon={Search}>
      <input
        value={query}
        onChange={(e) => buscar(e.target.value)}
        placeholder="Nombre de usuario…"
        className={inputCls}
      />
      {pending && <p className="text-xs text-text-muted">Buscando…</p>}
      {resultados.length > 0 && (
        <ul className="space-y-1">
          {resultados.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs">
              <span className="flex items-center gap-2 min-w-0">
                {m.avatarUrl ? (
                  <img src={m.avatarUrl} alt="" className="h-5 w-5 rounded-full shrink-0" />
                ) : (
                  <Users className="h-4 w-4 text-text-muted shrink-0" />
                )}
                <span className="truncate">
                  {m.nick ? `${m.nick} (${m.tag})` : m.tag} · <span className="font-mono text-text-muted">{m.id}</span>
                </span>
              </span>
              <button
                type="button"
                onClick={() => onSeleccionar(m.id)}
                className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-surface-2 transition-colors shrink-0"
              >
                Usar
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const ACCIONES_MODERACION = [
  { value: "silenciar_10m", label: "Silenciar 10 minutos" },
  { value: "silenciar_1h", label: "Silenciar 1 hora" },
  { value: "silenciar_1d", label: "Silenciar 1 día" },
  { value: "quitar_silencio", label: "Quitar silencio" },
  { value: "expulsar", label: "Expulsar del servidor" },
  { value: "banear", label: "Banear" },
  { value: "desbanear", label: "Quitar baneo" },
];

function ModeracionMiembroCard({ idPrefill }: { idPrefill: string }) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<Resultado | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <Card title="Moderación de un miembro" icon={Gavel}>
      <form
        ref={form}
        action={(fd) => start(async () => {
          const r = await accionModeracionAction(fd);
          setRes(r);
          if (r.ok) {
            form.current?.reset();
            router.refresh();
          }
        })}
        className="space-y-2"
      >
        <input
          key={idPrefill}
          name="discordId"
          required
          defaultValue={idPrefill}
          placeholder="ID de Discord del miembro"
          className={`${inputCls} font-mono`}
        />
        <select name="accion" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            Elegí una acción…
          </option>
          {ACCIONES_MODERACION.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <input name="motivo" placeholder="Motivo (opcional)" className={inputCls} />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md border border-danger/30 text-danger px-3 py-1.5 text-xs font-medium hover:bg-danger/10 transition-colors disabled:opacity-60"
          >
            {pending ? "Aplicando…" : "Aplicar"}
          </button>
          <Feedback resultado={res} />
        </div>
      </form>
    </Card>
  );
}

function PurgarMensajesCard({ canales }: { canales: CanalTexto[] }) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<(Resultado & { borrados?: number }) | null>(null);
  const form = useRef<HTMLFormElement>(null);

  return (
    <Card title="Purgar mensajes" icon={Eraser}>
      <form
        ref={form}
        action={(fd) => start(async () => {
          const r = await purgarMensajesAction(fd);
          setRes(r);
        })}
        className="grid grid-cols-[2fr_1fr] gap-2"
      >
        <select name="channelId" required disabled={canales.length === 0} className={inputCls}>
          <option value="">Canal…</option>
          {canales.map((c) => (
            <option key={c.id} value={c.id}>
              #{c.name}
            </option>
          ))}
        </select>
        <input name="cantidad" type="number" min={1} max={100} defaultValue={10} required className={inputCls} />
        <div className="col-span-2 flex items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md border border-danger/30 text-danger px-3 py-1.5 text-xs font-medium hover:bg-danger/10 transition-colors disabled:opacity-60"
          >
            {pending ? "Purgando…" : "Purgar"}
          </button>
          {res?.ok && <p className="text-xs text-success">Borrados: {res.borrados}</p>}
          {res && !res.ok && <Feedback resultado={res} />}
        </div>
      </form>
    </Card>
  );
}

function BloquearCanalCard({ canales }: { canales: CanalTexto[] }) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<Resultado | null>(null);

  function aplicar(fd: FormData) {
    start(async () => setRes(await bloquearCanalAction(fd)));
  }

  return (
    <Card title="Bloquear / desbloquear canal" icon={Lock}>
      <form action={aplicar} className="space-y-2">
        <select name="channelId" required disabled={canales.length === 0} className={inputCls}>
          <option value="">Canal…</option>
          {canales.map((c) => (
            <option key={c.id} value={c.id}>
              #{c.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            name="bloquear"
            value="true"
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md border border-danger/30 text-danger px-3 py-1.5 text-xs font-medium hover:bg-danger/10 transition-colors disabled:opacity-60"
          >
            <Lock className="h-3.5 w-3.5" /> Bloquear
          </button>
          <button
            type="submit"
            name="bloquear"
            value="false"
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface transition-colors disabled:opacity-60"
          >
            <Unlock className="h-3.5 w-3.5" /> Desbloquear
          </button>
          <Feedback resultado={res} />
        </div>
      </form>
    </Card>
  );
}

function SlowmodeCard({ canales }: { canales: CanalTexto[] }) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<Resultado | null>(null);

  return (
    <Card title="Modo lento" icon={Timer}>
      <form
        action={(fd) => start(async () => setRes(await cambiarSlowmodeAction(fd)))}
        className="grid grid-cols-[2fr_1fr] gap-2"
      >
        <select name="channelId" required disabled={canales.length === 0} className={inputCls}>
          <option value="">Canal…</option>
          {canales.map((c) => (
            <option key={c.id} value={c.id}>
              #{c.name}
            </option>
          ))}
        </select>
        <input name="segundos" type="number" min={0} max={21600} defaultValue={0} required className={inputCls} title="Segundos entre mensajes (0 = desactivado)" />
        <div className="col-span-2 flex items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover transition-colors disabled:opacity-60"
          >
            {pending ? "Aplicando…" : "Aplicar"}
          </button>
          <Feedback resultado={res} />
        </div>
      </form>
    </Card>
  );
}

function BaneadosCard({ baneados }: { baneados: Baneado[] }) {
  const [pending, start] = useTransition();
  const [resPorId, setResPorId] = useState<Record<string, Resultado>>({});
  const router = useRouter();

  function desbanear(id: string) {
    const fd = new FormData();
    fd.set("discordId", id);
    fd.set("accion", "desbanear");
    start(async () => {
      const r = await accionModeracionAction(fd);
      setResPorId((prev) => ({ ...prev, [id]: r }));
      if (r.ok) router.refresh();
    });
  }

  return (
    <Card title={`Usuarios baneados (${baneados.length})`} icon={Ban}>
      {baneados.length === 0 ? (
        <p className="text-xs text-text-muted">No hay nadie baneado.</p>
      ) : (
        <ul className="space-y-1 max-h-64 overflow-y-auto">
          {baneados.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs">
              <span className="min-w-0 truncate">
                {b.tag} <span className="font-mono text-text-muted">{b.id}</span>
                {b.motivo && <span className="text-text-muted"> · {b.motivo}</span>}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => desbanear(b.id)}
                className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-surface-2 transition-colors shrink-0 disabled:opacity-60"
              >
                {resPorId[b.id]?.ok ? "Desbaneado" : "Desbanear"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ---------- Automatización ----------

const TIPO_LABELS: Record<string, string> = {
  email: "Correo",
  ip: "IP",
  discord_id: "ID de Discord",
};

function AutomatizacionTab({ whitelist, configSeguridad }: { whitelist: WhitelistVM[]; configSeguridad: ConfigSeguridadVM }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Whitelist de pruebas" icon={Shield}>
        <p className="text-xs text-text-muted">
          Correos, IPs o IDs de Discord exentos de disparar tu aviso urgente — usalo para tus propias pruebas o
          mantenimiento.
        </p>
        <form action={agregarAlertaWhitelist} className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr_auto] gap-2">
          <select name="tipo" className={inputCls}>
            <option value="email">Correo</option>
            <option value="ip">IP</option>
            <option value="discord_id">ID de Discord</option>
          </select>
          <input name="valor" required placeholder="Valor a exentar" className={inputCls} />
          <input name="nota" placeholder="Nota (opcional)" className={inputCls} />
          <button
            type="submit"
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
          >
            Añadir
          </button>
        </form>

        {whitelist.length === 0 ? (
          <p className="text-xs text-text-muted">No hay nada en la whitelist todavía.</p>
        ) : (
          <ul className="space-y-1.5 max-h-64 overflow-y-auto">
            {whitelist.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 text-xs">
                <span>
                  <span className="text-text-muted">{TIPO_LABELS[w.tipo] ?? w.tipo}:</span>{" "}
                  <span className="font-mono">{w.valor}</span>
                  {w.nota && <span className="text-text-muted"> · {w.nota}</span>}
                </span>
                <form action={quitarAlertaWhitelist}>
                  <input type="hidden" name="id" value={w.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-danger/40 text-danger px-2.5 py-1 text-xs font-medium hover:bg-danger/10 transition-colors shrink-0"
                  >
                    Quitar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfigEscaneoCard configSeguridad={configSeguridad} />
    </div>
  );
}

function ConfigEscaneoCard({ configSeguridad }: { configSeguridad: ConfigSeguridadVM }) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<Resultado | null>(null);
  const [activo, setActivo] = useState(configSeguridad.escaneoActivo);

  return (
    <Card title="Escáner anti-raid / anti-nuke" icon={Settings2}>
      <form
        action={(fd) => start(async () => {
          try {
            await actualizarConfigSeguridadAction(fd);
            setRes({ ok: true });
          } catch (e) {
            setRes({ ok: false, error: String((e as Error)?.message ?? e) });
          }
        })}
        className="space-y-3"
      >
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            className="accent-accent"
          />
          Escáner activo (detección + logs + avisos al owner)
          <input type="hidden" name="escaneoActivo" value={activo ? "true" : "false"} />
        </label>

        <fieldset disabled={!activo} className="grid grid-cols-2 gap-2 disabled:opacity-50">
          <label className="text-[11px] text-text-muted">
            Umbral raid (entradas)
            <input name="umbralRaid" type="number" min={2} max={100} defaultValue={configSeguridad.umbralRaid} className={inputCls} />
          </label>
          <label className="text-[11px] text-text-muted">
            Ventana raid (ms)
            <input name="ventanaRaidMs" type="number" min={1000} max={300000} defaultValue={configSeguridad.ventanaRaidMs} className={inputCls} />
          </label>
          <label className="text-[11px] text-text-muted">
            Umbral nuke (canales/roles)
            <input name="umbralNuke" type="number" min={1} max={100} defaultValue={configSeguridad.umbralNuke} className={inputCls} />
          </label>
          <label className="text-[11px] text-text-muted">
            Ventana nuke (ms)
            <input name="ventanaNukeMs" type="number" min={1000} max={300000} defaultValue={configSeguridad.ventanaNukeMs} className={inputCls} />
          </label>
          <label className="text-[11px] text-text-muted">
            Umbral cadena de baneos
            <input name="umbralSanciones" type="number" min={1} max={100} defaultValue={configSeguridad.umbralSanciones} className={inputCls} />
          </label>
          <label className="text-[11px] text-text-muted">
            Ventana baneos (ms)
            <input name="ventanaSancionesMs" type="number" min={1000} max={300000} defaultValue={configSeguridad.ventanaSancionesMs} className={inputCls} />
          </label>
          <label className="text-[11px] text-text-muted col-span-2">
            Umbral borrado masivo de mensajes
            <input name="umbralBorradoMasivo" type="number" min={2} max={100} defaultValue={configSeguridad.umbralBorradoMasivo} className={inputCls} />
          </label>
        </fieldset>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover transition-colors disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
          <Feedback resultado={res} />
        </div>
      </form>
    </Card>
  );
}

// ---------- Historial ----------

function HistorialTab({ historial }: { historial: LineaHistorial[] }) {
  if (historial.length === 0) {
    return <p className="text-xs text-text-muted">No hay actividad registrada todavía.</p>;
  }
  return (
    <ul className="space-y-1.5 max-h-[32rem] overflow-y-auto">
      {historial.map((h, i) => (
        <li key={i} className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs">
          <span className="text-text-muted">{new Date(h.timestamp).toLocaleString("es-ES")}</span>
          <br />
          {h.descripcion}
        </li>
      ))}
    </ul>
  );
}

// ---------- Servidor ----------

function EstadisticasTab({ estadisticas }: { estadisticas: EstadisticasServidor | null }) {
  if (!estadisticas) {
    return <p className="text-xs text-text-muted">No se pudieron cargar las estadísticas del servidor.</p>;
  }
  const stats = [
    { label: "Miembros", value: estadisticas.miembros, icon: Users },
    { label: "Canales", value: estadisticas.canales, icon: Hash },
    { label: "Roles", value: estadisticas.roles, icon: Shield },
    { label: "Boosts", value: estadisticas.boosts, icon: Sparkles },
    { label: "Nivel de boost", value: estadisticas.nivelBoost, icon: Sparkles },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-md border border-border bg-surface-2 p-3 text-center">
          <s.icon className="h-4 w-4 text-accent mx-auto mb-1" />
          <p className="text-lg font-semibold">{s.value}</p>
          <p className="text-[11px] text-text-muted">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
