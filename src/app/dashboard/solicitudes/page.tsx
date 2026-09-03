import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import {
  ALCANCE_TRAMITE_LABELS,
  ESTADO_SOLICITUD_COLORS,
  ESTADO_SOLICITUD_LABELS,
  STAFF_ROLES,
} from "@/lib/labels";
import { actualizarSolicitud } from "@/lib/actions/solicitudes";
import { actualizarTramite, crearTramite } from "@/lib/actions/tramites";
import {
  actualizarTipoTramite,
  alternarActivoTipoTramite,
  crearTipoTramite,
} from "@/lib/actions/tipos-tramite";

function esTramiteDeAntecedentes(nombreTipo: string) {
  return nombreTipo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .includes("antecedentes");
}

export default async function SolicitudesStaffPage() {
  const session = await auth();
  const user = session!.user;
  const esJuezSupremo = user.role === "JUEZ_SUPREMO";

  const [tramites, solicitudes, tiposDisponibles, todosLosTipos] = await Promise.all([
    prisma.tramite.findMany({
      orderBy: { createdAt: "desc" },
      include: { tipo: true, ciudadano: true, empleado: true },
    }),
    prisma.solicitud.findMany({
      orderBy: { createdAt: "desc" },
      include: { ciudadano: true, empleado: true },
    }),
    // El personal puede solicitar tanto tramites internos como externos (los externos son para cualquiera).
    prisma.tipoTramite.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    esJuezSupremo ? prisma.tipoTramite.findMany({ orderBy: { nombre: "asc" } }) : Promise.resolve([]),
  ]);

  type Item =
    | { kind: "tramite"; id: string; fecha: Date; item: (typeof tramites)[number] }
    | { kind: "solicitud"; id: string; fecha: Date; item: (typeof solicitudes)[number] };

  const items: Item[] = [
    ...tramites.map((t) => ({ kind: "tramite" as const, id: t.id, fecha: t.createdAt, item: t })),
    ...solicitudes.map((s) => ({ kind: "solicitud" as const, id: s.id, fecha: s.createdAt, item: s })),
  ].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Solicitudes</h1>
        <p className="text-sm text-text-muted">
          Trámites y solicitudes presentados por la ciudadanía y el personal, todo en una bandeja.
        </p>
      </div>

      {tiposDisponibles.length > 0 && (
        <details className="rounded-lg border border-border bg-surface p-5">
          <summary className="cursor-pointer text-sm font-medium">+ Solicitar un trámite</summary>
          <form action={crearTramite} className="mt-4 space-y-3">
            <select
              name="tipoId"
              required
              defaultValue=""
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="" disabled>
                Selecciona un trámite
              </option>
              {tiposDisponibles.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} · {ALCANCE_TRAMITE_LABELS[t.alcance]}
                </option>
              ))}
            </select>
            <textarea
              name="detalle"
              required
              rows={3}
              placeholder="Detalle de tu solicitud"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
            >
              Enviar
            </button>
          </form>
        </details>
      )}

      <div className="rounded-lg border border-border bg-surface divide-y divide-border">
        {items.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-text-muted">No hay trámites ni solicitudes todavía.</p>
        )}
        {items.map((it) =>
          it.kind === "tramite" ? (
            <details key={`t-${it.id}`} className="group px-5 py-4">
              <summary className="flex flex-wrap items-center justify-between gap-3 cursor-pointer list-none">
                <div className="min-w-0">
                  <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent mr-2 uppercase tracking-wide">
                    Trámite
                  </span>
                  <span className="text-sm font-medium">{it.item.tipo.nombre}</span>
                  <p className="text-xs text-text-muted mt-0.5">
                    {it.item.ciudadano.nombre} {it.item.ciudadano.apellidos} ·{" "}
                    {new Date(it.item.createdAt).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {it.item.empleado && (
                    <span className="text-xs text-text-muted hidden sm:inline">Asignado a {it.item.empleado.nombre}</span>
                  )}
                  <StatusBadge label={ESTADO_SOLICITUD_LABELS[it.item.estado]} className={ESTADO_SOLICITUD_COLORS[it.item.estado]} />
                </div>
              </summary>

              <div className="mt-4 space-y-3 border-t border-border pt-4">
                <div>
                  <p className="text-xs font-medium text-text-muted mb-1">Detalle del solicitante</p>
                  <p className="text-sm whitespace-pre-wrap">{it.item.detalle}</p>
                </div>
                {it.item.respuesta && (
                  <div>
                    <p className="text-xs font-medium text-text-muted mb-1">Respuesta actual</p>
                    <p className="text-sm whitespace-pre-wrap">{it.item.respuesta}</p>
                  </div>
                )}
                {it.item.certificadoPdf && (
                  <p className="text-xs text-success">✅ Certificado en PDF ya generado y enviado.</p>
                )}
                <form action={actualizarTramite} className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-2">
                  <input type="hidden" name="id" value={it.item.id} />
                  <select
                    name="estado"
                    defaultValue={it.item.estado}
                    className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none focus:border-accent"
                  >
                    {Object.entries(ESTADO_SOLICITUD_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <div />
                  {esTramiteDeAntecedentes(it.item.tipo.nombre) && (
                    <>
                      <label className="text-xs text-text-muted self-center">¿Tiene antecedentes?</label>
                      <select
                        name="tieneAntecedentes"
                        defaultValue=""
                        className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none focus:border-accent"
                      >
                        <option value="">No generar certificado</option>
                        <option value="no">No tiene antecedentes → generar certificado limpio</option>
                        <option value="si">Sí tiene antecedentes → generar certificado con detalle</option>
                      </select>
                    </>
                  )}
                  <textarea
                    name="respuesta"
                    defaultValue={it.item.respuesta ?? ""}
                    rows={3}
                    placeholder="Respuesta / observaciones para el solicitante"
                    className="sm:col-span-2 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none focus:border-accent"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors w-fit"
                  >
                    Guardar
                  </button>
                </form>
              </div>
            </details>
          ) : (
            <details key={`s-${it.id}`} className="group px-5 py-4">
              <summary className="flex flex-wrap items-center justify-between gap-3 cursor-pointer list-none">
                <div className="min-w-0">
                  <span className="inline-flex items-center rounded-full border border-info/30 bg-info/10 px-2 py-0.5 text-[10px] font-semibold text-info mr-2 uppercase tracking-wide">
                    Solicitud
                  </span>
                  <span className="text-sm font-medium">{it.item.asunto}</span>
                  <p className="text-xs text-text-muted mt-0.5">
                    {it.item.categoria} · {it.item.ciudadano.nombre} {it.item.ciudadano.apellidos} ·{" "}
                    {new Date(it.item.createdAt).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {it.item.empleado && (
                    <span className="text-xs text-text-muted hidden sm:inline">Asignado a {it.item.empleado.nombre}</span>
                  )}
                  <StatusBadge label={ESTADO_SOLICITUD_LABELS[it.item.estado]} className={ESTADO_SOLICITUD_COLORS[it.item.estado]} />
                </div>
              </summary>

              <div className="mt-4 space-y-3 border-t border-border pt-4">
                <div>
                  <p className="text-xs font-medium text-text-muted mb-1">Descripción</p>
                  <p className="text-sm whitespace-pre-wrap">{it.item.descripcion}</p>
                </div>
                {it.item.respuesta && (
                  <div>
                    <p className="text-xs font-medium text-text-muted mb-1">Respuesta actual</p>
                    <p className="text-sm whitespace-pre-wrap">{it.item.respuesta}</p>
                  </div>
                )}
                <form action={actualizarSolicitud} className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-2">
                  <input type="hidden" name="id" value={it.item.id} />
                  <select
                    name="estado"
                    defaultValue={it.item.estado}
                    className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none focus:border-accent"
                  >
                    {Object.entries(ESTADO_SOLICITUD_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <div />
                  <textarea
                    name="respuesta"
                    defaultValue={it.item.respuesta ?? ""}
                    rows={3}
                    placeholder="Respuesta / resolución para el ciudadano"
                    className="sm:col-span-2 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none focus:border-accent"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors w-fit"
                  >
                    Guardar
                  </button>
                </form>
              </div>
            </details>
          ),
        )}
      </div>

      {esJuezSupremo && (
        <div className="space-y-3 border-t border-border pt-6">
          <h2 className="text-lg font-semibold">Catálogo de trámites (Juez Supremo)</h2>
          <details className="rounded-lg border border-border bg-surface p-5">
            <summary className="cursor-pointer text-sm font-medium">+ Nuevo tipo de trámite</summary>
            <form action={crearTipoTramite} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                name="nombre"
                required
                placeholder="Nombre del trámite"
                className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent sm:col-span-2"
              />
              <textarea
                name="descripcion"
                required
                rows={2}
                placeholder="Descripción"
                className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent sm:col-span-2"
              />
              <textarea
                name="requisitos"
                rows={2}
                placeholder="Requisitos (opcional)"
                className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent sm:col-span-2"
              />
              <input
                name="costo"
                type="number"
                min={0}
                placeholder="Costo ($, 0 = gratuito)"
                className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <select
                name="alcance"
                defaultValue="EXTERNO"
                className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
              >
                {Object.entries(ALCANCE_TRAMITE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="sm:col-span-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors w-fit"
              >
                Crear tipo de trámite
              </button>
            </form>
          </details>

          <div className="rounded-lg border border-border bg-surface divide-y divide-border">
            {todosLosTipos.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-text-muted">
                No hay ningún tipo de trámite configurado. Sin al menos uno, nadie podrá enviar trámites.
              </p>
            )}
            {todosLosTipos.map((t) => (
              <details key={t.id} className="px-5 py-4">
                <summary className="cursor-pointer flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{t.nombre}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">{ALCANCE_TRAMITE_LABELS[t.alcance]}</span>
                    <span
                      className={`text-xs rounded-full border px-2 py-0.5 font-medium ${
                        t.activo
                          ? "bg-success/15 text-success border-success/30"
                          : "bg-surface-3 text-text-muted border-border"
                      }`}
                    >
                      {t.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </summary>
                <div className="mt-3 space-y-3">
                  <form action={actualizarTipoTramite} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input type="hidden" name="id" value={t.id} />
                    <input
                      name="nombre"
                      defaultValue={t.nombre}
                      required
                      className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent sm:col-span-2"
                    />
                    <textarea
                      name="descripcion"
                      defaultValue={t.descripcion}
                      required
                      rows={2}
                      className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent sm:col-span-2"
                    />
                    <textarea
                      name="requisitos"
                      defaultValue={t.requisitos ?? ""}
                      rows={2}
                      className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent sm:col-span-2"
                    />
                    <input
                      name="costo"
                      type="number"
                      min={0}
                      defaultValue={t.costo}
                      className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                    />
                    <select
                      name="alcance"
                      defaultValue={t.alcance}
                      className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                    >
                      {Object.entries(ALCANCE_TRAMITE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="sm:col-span-2 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover transition-colors w-fit"
                    >
                      Guardar
                    </button>
                  </form>
                  <form action={alternarActivoTipoTramite}>
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2 transition-colors"
                    >
                      {t.activo ? "Desactivar" : "Reactivar"}
                    </button>
                  </form>
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
