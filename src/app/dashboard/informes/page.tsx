import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { crearInforme } from "@/lib/actions/informes";

export default async function InformesPage({
  searchParams,
}: {
  searchParams: Promise<{ etiqueta?: string }>;
}) {
  const { etiqueta } = await searchParams;

  const [informes, etiquetas] = await Promise.all([
    prisma.informe.findMany({
      where: etiqueta ? { etiquetas: { some: { nombre: etiqueta } } } : undefined,
      orderBy: { createdAt: "desc" },
      include: { autor: true, etiquetas: true },
    }),
    prisma.etiqueta.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Informes</h1>
          <p className="text-sm text-text-muted">Crea y consulta los informes de actividad del Departamento.</p>
        </div>
      </div>

      <details className="rounded-lg border border-border bg-surface p-5">
        <summary className="cursor-pointer text-sm font-medium">+ Nuevo informe</summary>
        <form action={crearInforme} className="mt-4 space-y-3">
          <input
            name="titulo"
            required
            placeholder="Título del informe"
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <textarea
            name="contenido"
            required
            rows={8}
            placeholder="Contenido del informe… (puede ser tan largo como haga falta)"
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            name="etiquetas"
            placeholder="Etiquetas separadas por coma (opcional, ej: patrullaje, incidente, seguimiento)"
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
          >
            Crear informe
          </button>
        </form>
      </details>

      {etiquetas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/informes"
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              !etiqueta ? "bg-accent/15 text-accent border-accent/30" : "border-border text-text-muted hover:text-text"
            }`}
          >
            Todos
          </Link>
          {etiquetas.map((et) => (
            <Link
              key={et.id}
              href={`/dashboard/informes?etiqueta=${encodeURIComponent(et.nombre)}`}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                etiqueta === et.nombre ? "bg-accent/15 text-accent border-accent/30" : "border-border text-text-muted hover:text-text"
              }`}
            >
              {et.nombre}
            </Link>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface">
        {informes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ClipboardList className="h-10 w-10 text-text-muted" />
            <p className="text-sm font-semibold">Sin informes</p>
            <p className="text-xs text-text-muted">Crea tu primer informe con el formulario de arriba.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {informes.map((inf) => (
              <li key={inf.id} className="px-5 py-4">
                <p className="text-sm font-medium">{inf.titulo}</p>
                <p className="text-sm text-text-muted mt-1 whitespace-pre-wrap">{inf.contenido}</p>
                {inf.etiquetas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {inf.etiquetas.map((et) => (
                      <span
                        key={et.id}
                        className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent"
                      >
                        {et.nombre}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-text-muted mt-2">
                  {inf.autor.nombre} {inf.autor.apellidos} ·{" "}
                  {new Date(inf.createdAt).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
