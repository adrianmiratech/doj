import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { enviarFeedback, cambiarEstadoFeedback } from "@/lib/actions/feedback";

const ESTADO_LABEL: Record<string, string> = { PENDIENTE: "Pendiente", ACEPTADA: "Aceptada", RECHAZADA: "Rechazada" };
const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE: "bg-warning/15 text-warning border-warning/30",
  ACEPTADA: "bg-success/15 text-success border-success/30",
  RECHAZADA: "bg-danger/15 text-danger border-danger/30",
};

export default async function FeedbackPage() {
  const session = await auth();
  const esJuezSupremo = session!.user.role === "JUEZ_SUPREMO";

  const items = esJuezSupremo
    ? await prisma.feedback.findMany({ orderBy: { createdAt: "desc" }, include: { autor: true } })
    : [];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Quejas y Sugerencias</h1>
        <p className="text-sm text-text-muted">Comparte tu opinión con la administración del Departamento.</p>
      </div>

      <form action={enviarFeedback} className="rounded-lg border border-border bg-surface p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm cursor-pointer has-[:checked]:border-accent has-[:checked]:bg-accent/10">
            <input type="radio" name="tipo" value="Sugerencia" defaultChecked className="accent-[color:var(--accent)]" />
            Sugerencia
          </label>
          <label className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm cursor-pointer has-[:checked]:border-accent has-[:checked]:bg-accent/10">
            <input type="radio" name="tipo" value="Queja" className="accent-[color:var(--accent)]" />
            Queja
          </label>
        </div>
        <textarea
          name="contenido"
          required
          rows={4}
          placeholder="Describe tu idea o propuesta de mejora…"
          className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input type="checkbox" name="anonimo" className="accent-[color:var(--accent)]" />
          Enviar de forma anónima — no se guardará tu identidad
        </label>
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
        >
          Enviar
        </button>
      </form>

      {esJuezSupremo && (
        <div className="rounded-lg border border-border bg-surface divide-y divide-border">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold">Buzón del Departamento (Juez Supremo)</h2>
          </div>
          {items.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-text-muted">Sin mensajes todavía.</p>
          )}
          {items.map((f) => (
            <div key={f.id} className="px-5 py-4">
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    f.tipo === "Queja"
                      ? "bg-danger/15 text-danger border-danger/30"
                      : "bg-accent/15 text-accent border-accent/30"
                  }`}
                >
                  {f.tipo}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${ESTADO_COLOR[f.estado]}`}
                  >
                    {ESTADO_LABEL[f.estado]}
                  </span>
                  <span className="text-xs text-text-muted">
                    {new Date(f.createdAt).toLocaleDateString("es-ES")}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-sm">{f.contenido}</p>
              <p className="mt-1 text-xs text-text-muted">
                {f.anonimo || !f.autor ? "Anónimo" : `${f.autor.nombre} ${f.autor.apellidos}`}
              </p>
              <form action={cambiarEstadoFeedback} className="mt-2 flex gap-2">
                <input type="hidden" name="id" value={f.id} />
                {(["PENDIENTE", "ACEPTADA", "RECHAZADA"] as const)
                  .filter((e) => e !== f.estado)
                  .map((e) => (
                    <button
                      key={e}
                      type="submit"
                      name="estado"
                      value={e}
                      className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-2 transition-colors"
                    >
                      Marcar {ESTADO_LABEL[e].toLowerCase()}
                    </button>
                  ))}
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
