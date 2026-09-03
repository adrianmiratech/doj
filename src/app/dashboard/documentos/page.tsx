import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function DocumentosPage() {
  const session = await auth();
  if (session?.user.role !== "JUEZ_SUPREMO") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Generar documento oficial</h1>
        <p className="text-sm text-text-muted">
          Escribí un título y el contenido, y se genera un PDF con membrete, sello y tu firma como si fuera un
          documento oficial del Departamento de Justicia del Estado de San Andreas.
        </p>
      </div>

      <form
        action="/api/documentos/generar"
        method="POST"
        className="rounded-lg border border-border bg-surface p-5 space-y-4"
      >
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Título del documento</label>
          <input
            name="titulo"
            required
            placeholder="Ej: Comunicado oficial, Notificación, Acta..."
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Contenido</label>
          <textarea
            name="contenido"
            required
            rows={10}
            placeholder="Escribí el texto del documento…"
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
        >
          Generar y descargar PDF
        </button>
      </form>
    </div>
  );
}
