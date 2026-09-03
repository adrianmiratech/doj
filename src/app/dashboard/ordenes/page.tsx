import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { ESTADO_ORDEN_COLORS, ESTADO_ORDEN_LABELS, ROLE_LABELS, TIPOS_ORDEN_JUDICIAL } from "@/lib/labels";
import { tienePermiso } from "@/lib/permisos";
import { marcarOrdenEjecutada, resolverOrden, solicitarOrden } from "@/lib/actions/ordenes";

export default async function OrdenesJudicialesPage() {
  const session = await auth();
  const user = session!.user;
  if (user.role === "CIVIL") redirect("/portal");

  const puedeResolver =
    user.role === "JUEZ_SUPREMO" ||
    user.role === "JUEZ_DISTRITO" ||
    user.role === "FISCAL_GENERAL" ||
    (await tienePermiso(user.role, "RESOLVER_ORDENES"));

  const ordenes = await prisma.ordenJudicial.findMany({
    orderBy: { createdAt: "desc" },
    include: { solicitante: true, resueltaPor: true },
  });

  const pendientes = ordenes.filter((o) => o.estado === "PENDIENTE");
  const resueltas = ordenes.filter((o) => o.estado !== "PENDIENTE");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Órdenes judiciales</h1>
        <p className="text-sm text-text-muted">
          Solicita órdenes de allanamiento, arresto o registro; un Juez (o Fiscal General) las resuelve.
        </p>
      </div>

      <details className="rounded-lg border border-border bg-surface p-5">
        <summary className="cursor-pointer text-sm font-medium">+ Solicitar orden judicial</summary>
        <form action={solicitarOrden} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3" encType="multipart/form-data">
          <select
            name="tipo"
            required
            defaultValue=""
            className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="" disabled>
              Tipo de orden
            </option>
            {TIPOS_ORDEN_JUDICIAL.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            name="objetivo"
            required
            placeholder="Persona o lugar objetivo"
            className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <textarea
            name="motivo"
            required
            rows={3}
            placeholder="Motivo / justificación de la orden"
            className="sm:col-span-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div className="sm:col-span-2">
            <label className="block text-xs text-text-muted mb-1.5">Evidencias (archivo o enlace)</label>
            <input
              name="evidenciasArchivo"
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="w-full text-xs text-text-muted file:mr-2 file:rounded-md file:border file:border-border file:bg-surface-2 file:px-2.5 file:py-1.5 file:text-xs file:font-medium mb-2"
            />
            <input
              name="evidencias"
              placeholder="…o pegar un enlace"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            className="sm:col-span-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors w-fit"
          >
            Solicitar orden
          </button>
        </form>
      </details>

      <div className="rounded-lg border border-border bg-surface divide-y divide-border">
        {pendientes.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-text-muted">No hay órdenes pendientes.</p>
        )}
        {pendientes.map((o) => (
          <div key={o.id} className="px-5 py-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {o.tipo} · {o.objetivo}
                </p>
                <p className="text-xs text-text-muted">
                  Solicitada por {o.solicitante.nombre} {o.solicitante.apellidos} ({ROLE_LABELS[o.solicitante.role]}) ·{" "}
                  {new Date(o.createdAt).toLocaleDateString("es-ES")}
                </p>
              </div>
              <StatusBadge label={ESTADO_ORDEN_LABELS[o.estado]} className={ESTADO_ORDEN_COLORS[o.estado]} />
            </div>
            <p className="text-sm whitespace-pre-wrap">{o.motivo}</p>
            {o.evidencias && (
              <a href={o.evidencias} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline">
                Ver evidencias
              </a>
            )}
            {puedeResolver && (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 pt-1">
                <input
                  form={`resolver-${o.id}`}
                  name="respuesta"
                  placeholder="Nota (opcional)"
                  className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                />
                <form id={`resolver-${o.id}`} action={resolverOrden} className="contents">
                  <input type="hidden" name="id" value={o.id} />
                  <button
                    type="submit"
                    name="accion"
                    value="APROBADA"
                    className="rounded-md bg-success px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                  >
                    Aprobar
                  </button>
                  <button
                    type="submit"
                    name="accion"
                    value="RECHAZADA"
                    className="rounded-md bg-danger px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                  >
                    Rechazar
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>

      {resueltas.length > 0 && (
        <div className="rounded-lg border border-border bg-surface divide-y divide-border">
          {resueltas.map((o) => (
            <div key={o.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {o.tipo} · {o.objetivo}
                </p>
                <p className="text-xs text-text-muted">
                  {o.solicitante.nombre} {o.solicitante.apellidos}
                  {o.resueltaPor ? ` · resuelta por ${o.resueltaPor.nombre} ${o.resueltaPor.apellidos}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge label={ESTADO_ORDEN_LABELS[o.estado]} className={ESTADO_ORDEN_COLORS[o.estado]} />
                {o.estado === "APROBADA" && o.solicitanteId === user.id && (
                  <form action={marcarOrdenEjecutada}>
                    <input type="hidden" name="id" value={o.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-2 transition-colors"
                    >
                      Marcar ejecutada
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
