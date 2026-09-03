import { ClipboardList } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { crearInforme } from "@/lib/actions/informes";

export default async function InformesPage() {
  const informes = await prisma.informe.findMany({
    orderBy: { createdAt: "desc" },
    include: { autor: true },
  });

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
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
          >
            Crear informe
          </button>
        </form>
      </details>

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
