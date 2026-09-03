import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tienePermiso } from "@/lib/permisos";
import { publicarResolucion } from "@/lib/actions/resoluciones";

export default async function ResolucionesPage() {
  const session = await auth();
  const user = session!.user;
  if (user.role === "CIVIL") redirect("/portal");

  const puedePublicar =
    user.role === "JUEZ_SUPREMO" || user.role === "JUEZ_DISTRITO" || (await tienePermiso(user.role, "RESOLVER_ORDENES"));

  const resoluciones = await prisma.resolucion.findMany({
    orderBy: { createdAt: "desc" },
    include: { autor: true, caso: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Resoluciones</h1>
        <p className="text-sm text-text-muted">Fallos, decretos y comunicados oficiales del Departamento.</p>
      </div>

      {puedePublicar && (
        <details className="rounded-lg border border-border bg-surface p-5">
          <summary className="cursor-pointer text-sm font-medium">+ Publicar resolución</summary>
          <form action={publicarResolucion} className="mt-4 space-y-3">
            <input
              name="titulo"
              required
              placeholder="Título"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <textarea
              name="contenido"
              required
              rows={6}
              placeholder="Contenido de la resolución"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <input
              name="casoId"
              placeholder="ID de expediente vinculado (opcional)"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent font-mono"
            />
            <button
              type="submit"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
            >
              Publicar
            </button>
          </form>
        </details>
      )}

      <div className="rounded-lg border border-border bg-surface divide-y divide-border">
        {resoluciones.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-text-muted">No hay resoluciones publicadas.</p>
        )}
        {resoluciones.map((r) => (
          <div key={r.id} className="px-5 py-4">
            <p className="text-sm font-medium">{r.titulo}</p>
            <p className="text-xs text-text-muted mb-2">
              {r.autor.nombre} {r.autor.apellidos} · {new Date(r.createdAt).toLocaleDateString("es-ES")}
              {r.caso ? ` · Expediente ${r.caso.expediente}` : ""}
            </p>
            <p className="text-sm whitespace-pre-wrap">{r.contenido}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
