import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { ESTADO_CASO_COLORS, ESTADO_CASO_LABELS } from "@/lib/labels";
import { agregarNotaCaso, agregarParteCaso, cambiarEstadoCaso } from "@/lib/actions/casos";
import { crearAudiencia } from "@/lib/actions/audiencias";

export default async function CasoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [caso, jueces, civiles] = await Promise.all([
    prisma.caso.findUnique({
      where: { id },
      include: {
        responsable: true,
        notas: { include: { autor: true }, orderBy: { createdAt: "desc" } },
        audiencias: { include: { juez: true }, orderBy: { fecha: "asc" } },
        partesRelacionadas: { include: { user: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ["JUEZ_SUPREMO", "JUEZ_DISTRITO"] }, activo: true },
    }),
    prisma.user.findMany({
      where: { role: "CIVIL", activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, apellidos: true, dni: true },
    }),
  ]);

  if (!caso) notFound();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-mono text-accent">{caso.expediente}</p>
          <h1 className="text-xl font-semibold">{caso.titulo}</h1>
          <p className="text-sm text-text-muted">
            {caso.tipo} · Responsable: {caso.responsable.nombre} {caso.responsable.apellidos}
          </p>
        </div>
        <StatusBadge label={ESTADO_CASO_LABELS[caso.estado]} className={ESTADO_CASO_COLORS[caso.estado]} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-5 space-y-3">
        <p className="text-sm whitespace-pre-wrap">{caso.descripcion}</p>
        {caso.partes && <p className="text-sm text-text-muted whitespace-pre-wrap">Partes: {caso.partes}</p>}

        <form action={cambiarEstadoCaso} className="flex items-center gap-2 pt-2">
          <input type="hidden" name="id" value={caso.id} />
          <select
            name="estado"
            defaultValue={caso.estado}
            className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none focus:border-accent"
          >
            {Object.entries(ESTADO_CASO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
          >
            Actualizar estado
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold">Partes involucradas (ciudadanos registrados)</h2>
        </div>
        <ul className="divide-y divide-border">
          {caso.partesRelacionadas.length === 0 && (
            <li className="px-5 py-6 text-sm text-text-muted text-center">Sin ciudadanos vinculados todavía.</li>
          )}
          {caso.partesRelacionadas.map((p) => (
            <li key={p.id} className="px-5 py-3 text-sm">
              {p.user.nombre} {p.user.apellidos} <span className="text-text-muted">· {p.rol}</span>
            </li>
          ))}
        </ul>
        <form action={agregarParteCaso} className="p-5 border-t border-border grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
          <input type="hidden" name="casoId" value={caso.id} />
          <select
            name="userId"
            required
            defaultValue=""
            className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none focus:border-accent"
          >
            <option value="" disabled>
              Ciudadano
            </option>
            {civiles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} {c.apellidos} · {c.dni}
              </option>
            ))}
          </select>
          <input
            name="rol"
            placeholder="Rol (Denunciante, Acusado, Testigo…)"
            className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
          >
            Vincular
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold">Audiencias</h2>
        </div>
        <ul className="divide-y divide-border">
          {caso.audiencias.length === 0 && (
            <li className="px-5 py-6 text-sm text-text-muted text-center">Sin audiencias programadas.</li>
          )}
          {caso.audiencias.map((a) => (
            <li key={a.id} className="px-5 py-3 text-sm">
              <p className="font-medium">
                {new Date(a.fecha).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })} ·{" "}
                {a.lugar}
              </p>
              <p className="text-text-muted">
                Juez: {a.juez.nombre} {a.juez.apellidos}
              </p>
              {a.notas && <p className="text-text-muted whitespace-pre-wrap mt-1">{a.notas}</p>}
            </li>
          ))}
        </ul>
        <form action={crearAudiencia} className="p-5 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input type="hidden" name="casoId" value={caso.id} />
          <select
            name="juezId"
            required
            defaultValue=""
            className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none focus:border-accent"
          >
            <option value="" disabled>
              Juez asignado
            </option>
            {jueces.map((j) => (
              <option key={j.id} value={j.id}>
                {j.nombre} {j.apellidos}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            name="fecha"
            required
            className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none focus:border-accent"
          />
          <input
            name="lugar"
            placeholder="Sala de Audiencias 1"
            className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none focus:border-accent"
          />
          <textarea
            name="notas"
            rows={2}
            placeholder="Notas (opcional)"
            className="sm:col-span-2 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="sm:col-span-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors w-fit"
          >
            Programar audiencia
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold">Notas del expediente</h2>
        </div>
        <ul className="divide-y divide-border">
          {caso.notas.length === 0 && (
            <li className="px-5 py-6 text-sm text-text-muted text-center">Sin notas todavía.</li>
          )}
          {caso.notas.map((n) => (
            <li key={n.id} className="px-5 py-3 text-sm">
              <p className="whitespace-pre-wrap">{n.contenido}</p>
              <p className="text-xs text-text-muted mt-1">
                {n.autor.nombre} {n.autor.apellidos} ·{" "}
                {new Date(n.createdAt).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </li>
          ))}
        </ul>
        <form action={agregarNotaCaso} className="p-5 border-t border-border flex flex-col sm:flex-row gap-2">
          <input type="hidden" name="casoId" value={caso.id} />
          <textarea
            name="contenido"
            required
            rows={2}
            placeholder="Añadir una nota al expediente…"
            className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors w-fit self-start"
          >
            Añadir
          </button>
        </form>
      </div>
    </div>
  );
}
