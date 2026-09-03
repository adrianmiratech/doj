import { Gift, CheckCircle2, Clock, DollarSign } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { ESTADO_PLUS_COLORS, ESTADO_PLUS_LABELS, STAFF_ROLES } from "@/lib/labels";
import { etiquetaSemana, opcionesSemanas } from "@/lib/semanas";
import { gestionarPlus } from "@/lib/actions/pluses";
import { alternarActivoTipoPlus, actualizarTipoPlus, crearTipoPlus } from "@/lib/actions/tipos-plus";
import { PlusesDisponibles } from "./pluses-disponibles";
import type { Role } from "@/generated/prisma/enums";

export default async function PlusesPage() {
  const session = await auth();
  const user = session!.user;
  const esJuezSupremo = user.role === "JUEZ_SUPREMO";
  const semanaActual = etiquetaSemana(new Date());

  const [tiposActivos, todosLosTipos, agentes, misPluses, pendientesGlobal] = await Promise.all([
    prisma.tipoPlus.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    esJuezSupremo ? prisma.tipoPlus.findMany({ orderBy: { nombre: "asc" } }) : Promise.resolve([]),
    prisma.user.findMany({
      where: { role: { in: STAFF_ROLES as unknown as Role[] }, activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, apellidos: true },
    }),
    prisma.plus.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { tipo: true },
    }),
    esJuezSupremo
      ? prisma.plus.findMany({
          where: { estado: "PENDIENTE" },
          orderBy: { createdAt: "asc" },
          include: { tipo: true, user: true },
        })
      : Promise.resolve([]),
  ]);

  const aprobados = misPluses.filter((p) => p.estado === "APROBADO").length;
  const pendientes = misPluses.filter((p) => p.estado === "PENDIENTE").length;
  const totalSemanal = misPluses
    .filter((p) => p.estado === "APROBADO" && p.semana === semanaActual)
    .reduce((acc, p) => acc + p.tipo.monto, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Mis Pluses</h1>
          <p className="text-sm text-text-muted">Gestiona tus pluses y solicita nuevos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-surface p-4">
          <Gift className="h-5 w-5 text-accent mb-1" />
          <p className="text-xl font-semibold">{tiposActivos.length}</p>
          <p className="text-xs text-text-muted">Disponibles</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <CheckCircle2 className="h-5 w-5 text-success mb-1" />
          <p className="text-xl font-semibold">{aprobados}</p>
          <p className="text-xs text-text-muted">Aprobados</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <Clock className="h-5 w-5 text-warning mb-1" />
          <p className="text-xl font-semibold">{pendientes}</p>
          <p className="text-xs text-text-muted">Pendientes</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <DollarSign className="h-5 w-5 text-accent mb-1" />
          <p className="text-xl font-semibold">${totalSemanal.toLocaleString("es-ES")}</p>
          <p className="text-xs text-text-muted">Total semanal</p>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3">Pluses Disponibles — pulsa para registrar</h2>
        <PlusesDisponibles
          tipos={tiposActivos}
          agentes={agentes}
          semanas={opcionesSemanas()}
          miId={user.id}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold">Historial</h2>
        </div>
        <ul className="divide-y divide-border">
          {misPluses.length === 0 && (
            <li className="px-5 py-6 text-sm text-text-muted text-center">Sin pluses registrados.</li>
          )}
          {misPluses.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium">{p.tipo.nombre}</p>
                <p className="text-xs text-text-muted">
                  {p.semana} · {new Date(p.createdAt).toLocaleDateString("es-ES")}
                  {p.notas ? ` · ${p.notas}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm">${p.tipo.monto.toLocaleString("es-ES")}</span>
                <StatusBadge label={ESTADO_PLUS_LABELS[p.estado]} className={ESTADO_PLUS_COLORS[p.estado]} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {esJuezSupremo && (
        <div className="space-y-6 border-t border-border pt-6">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Solicitudes pendientes (Juez Supremo)</h2>
            <div className="rounded-lg border border-border bg-surface divide-y divide-border">
              {pendientesGlobal.length === 0 && (
                <p className="px-5 py-6 text-sm text-text-muted text-center">No hay solicitudes pendientes.</p>
              )}
              {pendientesGlobal.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">
                      {p.user.nombre} {p.user.apellidos} · {p.tipo.nombre}
                    </p>
                    <p className="text-xs text-text-muted">
                      {p.semana} · ${p.tipo.monto.toLocaleString("es-ES")}
                      {p.notas ? ` · ${p.notas}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <form action={gestionarPlus}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="estado" value="APROBADO" />
                      <button
                        type="submit"
                        className="rounded-md bg-success px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                      >
                        Aprobar
                      </button>
                    </form>
                    <form action={gestionarPlus}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="estado" value="RECHAZADO" />
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

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Catálogo de pluses</h2>
            <details className="rounded-lg border border-border bg-surface p-5">
              <summary className="cursor-pointer text-sm font-medium">+ Nuevo tipo de plus</summary>
              <form action={crearTipoPlus} className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  name="nombre"
                  required
                  placeholder="Nombre"
                  className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <input
                  name="monto"
                  type="number"
                  min={0}
                  required
                  placeholder="Importe"
                  className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <input
                  name="descripcion"
                  placeholder="Descripción (opcional)"
                  className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  className="sm:col-span-3 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors w-fit"
                >
                  Crear tipo de plus
                </button>
              </form>
            </details>

            <div className="rounded-lg border border-border bg-surface divide-y divide-border">
              {todosLosTipos.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-text-muted">
                  No hay tipos de plus configurados. Crea el primero arriba.
                </p>
              )}
              {todosLosTipos.map((t) => (
                <details key={t.id} className="px-5 py-3.5">
                  <summary className="cursor-pointer flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">
                      {t.nombre} <span className="text-text-muted font-normal">· ${t.monto.toLocaleString("es-ES")}</span>
                    </span>
                    <span
                      className={`text-xs rounded-full border px-2 py-0.5 font-medium ${
                        t.activo
                          ? "bg-success/15 text-success border-success/30"
                          : "bg-surface-3 text-text-muted border-border"
                      }`}
                    >
                      {t.activo ? "Activo" : "Inactivo"}
                    </span>
                  </summary>
                  <div className="mt-3 space-y-3">
                    <form action={actualizarTipoPlus} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input type="hidden" name="id" value={t.id} />
                      <input
                        name="nombre"
                        defaultValue={t.nombre}
                        required
                        className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                      />
                      <input
                        name="monto"
                        type="number"
                        min={0}
                        defaultValue={t.monto}
                        required
                        className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                      />
                      <input
                        name="descripcion"
                        defaultValue={t.descripcion ?? ""}
                        className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover transition-colors w-fit"
                      >
                        Guardar
                      </button>
                    </form>
                    <form action={alternarActivoTipoPlus}>
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
        </div>
      )}
    </div>
  );
}
