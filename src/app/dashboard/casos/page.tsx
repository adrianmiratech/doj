import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { ESTADO_CASO_COLORS, ESTADO_CASO_LABELS } from "@/lib/labels";
import { crearCaso } from "@/lib/actions/casos";

export default async function CasosPage() {
  const [casos, civiles] = await Promise.all([
    prisma.caso.findMany({
      orderBy: { createdAt: "desc" },
      include: { responsable: true, _count: { select: { audiencias: true } } },
    }),
    prisma.user.findMany({
      where: { role: "CIVIL", activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, apellidos: true, dni: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Expedientes judiciales</h1>
          <p className="text-sm text-text-muted">Casos abiertos por la Fiscalía y los Tribunales.</p>
        </div>
      </div>

      <details className="rounded-lg border border-border bg-surface p-5">
        <summary className="cursor-pointer text-sm font-medium">+ Abrir nuevo expediente</summary>
        <form action={crearCaso} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            name="titulo"
            required
            placeholder="Título del caso"
            className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent sm:col-span-2"
          />
          <select
            name="tipo"
            required
            defaultValue=""
            className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="" disabled>
              Tipo de caso
            </option>
            <option value="Penal">Penal</option>
            <option value="Civil">Civil</option>
            <option value="Administrativo">Administrativo</option>
          </select>
          <input
            name="partes"
            placeholder="Partes (ej. Fiscalía vs. N.N.)"
            className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <textarea
            name="descripcion"
            required
            rows={3}
            placeholder="Descripción del caso"
            className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5">
              Ciudadanos registrados involucrados (verán este caso en su portal)
            </label>
            <div className="max-h-32 overflow-y-auto rounded-md border border-border bg-surface-2 divide-y divide-border">
              {civiles.length === 0 && (
                <p className="px-3 py-2 text-xs text-text-muted">No hay ciudadanos registrados todavía.</p>
              )}
              {civiles.map((c) => (
                <label key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <input type="checkbox" name="civiles" value={c.id} className="accent-[color:var(--accent)]" />
                  {c.nombre} {c.apellidos} <span className="text-text-muted text-xs">· {c.dni}</span>
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="sm:col-span-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors w-fit"
          >
            Crear expediente
          </button>
        </form>
      </details>

      <div className="rounded-lg border border-border bg-surface divide-y divide-border">
        {casos.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-text-muted">
            No hay expedientes registrados todavía.
          </p>
        )}
        {casos.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/casos/${c.id}`}
            className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-surface-2 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-xs font-mono text-accent">{c.expediente}</p>
              <p className="text-sm font-medium truncate">{c.titulo}</p>
              <p className="text-xs text-text-muted">
                {c.tipo} · Responsable: {c.responsable.nombre} {c.responsable.apellidos} ·{" "}
                {c._count.audiencias} audiencia(s)
              </p>
            </div>
            <StatusBadge label={ESTADO_CASO_LABELS[c.estado]} className={ESTADO_CASO_COLORS[c.estado]} />
          </Link>
        ))}
      </div>
    </div>
  );
}
