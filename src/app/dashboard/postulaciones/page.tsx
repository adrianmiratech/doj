import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { ESTADO_POSTULACION_COLORS, ESTADO_POSTULACION_LABELS, POSTULABLE_ROLES, ROLE_LABELS } from "@/lib/labels";
import {
  alternarActivaPreguntaPostulacion,
  aprobarPostulacion,
  crearPreguntaPostulacion,
  rechazarPostulacion,
} from "@/lib/actions/postulaciones";

export default async function PostulacionesAdminPage() {
  const session = await auth();
  if (session?.user.role !== "JUEZ_SUPREMO") {
    redirect("/dashboard");
  }

  const [postulaciones, preguntas] = await Promise.all([
    prisma.postulacion.findMany({
      orderBy: { createdAt: "desc" },
      include: { candidato: true, revisadaPor: true, respuestasPreguntas: { include: { pregunta: true } } },
    }),
    prisma.preguntaPostulacion.findMany({ orderBy: [{ rango: "asc" }, { orden: "asc" }] }),
  ]);

  const pendientes = postulaciones.filter((p) => p.estado === "PENDIENTE");
  const resueltas = postulaciones.filter((p) => p.estado !== "PENDIENTE");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Postulaciones</h1>
        <p className="text-sm text-text-muted">
          Revisa las postulaciones de ciudadanos a un rango del Departamento. Al aprobar una, el candidato pasa a
          ser empleado, se le crea un contrato laboral pendiente de firma y una primera nómina, y se sincroniza su
          rol/apodo de Discord si tiene su cuenta vinculada.
        </p>
      </div>

      <details className="rounded-lg border border-border bg-surface p-5">
        <summary className="cursor-pointer text-sm font-medium">Preguntas de postulación por rango</summary>
        <div className="mt-4 space-y-4">
          {POSTULABLE_ROLES.map((r) => (
            <div key={r} className="space-y-2">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{ROLE_LABELS[r]}</p>
              <ul className="space-y-1.5">
                {preguntas
                  .filter((p) => p.rango === r)
                  .map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-xs">
                      <span className={p.activa ? "" : "text-text-muted line-through"}>{p.texto}</span>
                      <form action={alternarActivaPreguntaPostulacion}>
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-3 transition-colors shrink-0"
                        >
                          {p.activa ? "Desactivar" : "Activar"}
                        </button>
                      </form>
                    </li>
                  ))}
              </ul>
              <form action={crearPreguntaPostulacion} className="flex items-center gap-2">
                <input type="hidden" name="rango" value={r} />
                <input
                  name="texto"
                  required
                  placeholder="Nueva pregunta"
                  className="flex-1 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2 transition-colors shrink-0"
                >
                  Añadir
                </button>
              </form>
            </div>
          ))}
        </div>
      </details>

      <div className="rounded-lg border border-border bg-surface divide-y divide-border">
        {pendientes.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-text-muted">No hay postulaciones pendientes.</p>
        )}
        {pendientes.map((p) => (
          <div key={p.id} className="px-5 py-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {p.candidato.nombre} {p.candidato.apellidos} → {ROLE_LABELS[p.rango]}
                </p>
                <p className="text-xs text-text-muted">
                  {p.candidato.email} · Enviada el {new Date(p.createdAt).toLocaleDateString("es-ES")}
                </p>
              </div>
              <StatusBadge label={ESTADO_POSTULACION_LABELS[p.estado]} className={ESTADO_POSTULACION_COLORS[p.estado]} />
            </div>

            <p className="text-sm whitespace-pre-wrap rounded-md bg-surface-2 border border-border px-3 py-2">
              {p.motivacion}
            </p>
            {p.experiencia && (
              <p className="text-sm whitespace-pre-wrap rounded-md bg-surface-2 border border-border px-3 py-2">
                <span className="text-text-muted">Experiencia: </span>
                {p.experiencia}
              </p>
            )}
            {p.respuestasPreguntas.map((r) => (
              <p key={r.id} className="text-sm whitespace-pre-wrap rounded-md bg-surface-2 border border-border px-3 py-2">
                <span className="text-text-muted">{r.pregunta.texto}: </span>
                {r.respuesta}
              </p>
            ))}

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <form action={aprobarPostulacion} className="contents">
                <input type="hidden" name="id" value={p.id} />
                <input
                  name="cargo"
                  placeholder="Destino / especialidad (opcional)"
                  className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  className="rounded-md bg-success px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                >
                  Aprobar y contratar
                </button>
              </form>
            </div>

            <form action={rechazarPostulacion} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <input type="hidden" name="id" value={p.id} />
              <input
                name="respuesta"
                placeholder="Motivo del rechazo (opcional)"
                className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="rounded-md bg-danger px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
              >
                Rechazar
              </button>
            </form>
          </div>
        ))}
      </div>

      {resueltas.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-text-muted">Historial</h2>
          <div className="rounded-lg border border-border bg-surface divide-y divide-border">
            {resueltas.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {p.candidato.nombre} {p.candidato.apellidos} · {ROLE_LABELS[p.rango]}
                  </p>
                  <p className="text-xs text-text-muted">
                    {p.revisadaPor ? `Revisada por ${p.revisadaPor.nombre} ${p.revisadaPor.apellidos}` : "Cerrada automáticamente"}
                  </p>
                </div>
                <StatusBadge label={ESTADO_POSTULACION_LABELS[p.estado]} className={ESTADO_POSTULACION_COLORS[p.estado]} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
