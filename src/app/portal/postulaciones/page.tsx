import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { ESTADO_POSTULACION_COLORS, ESTADO_POSTULACION_LABELS, POSTULABLE_ROLES, ROLE_LABELS, ROLE_TIER_LABELS } from "@/lib/labels";
import { crearPostulacion } from "@/lib/actions/postulaciones";

export default async function PostulacionesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [postulaciones, preguntas] = await Promise.all([
    prisma.postulacion.findMany({
      where: { candidatoId: userId },
      orderBy: { createdAt: "desc" },
      include: { respuestasPreguntas: { include: { pregunta: true } } },
    }),
    prisma.preguntaPostulacion.findMany({ where: { activa: true }, orderBy: { orden: "asc" } }),
  ]);

  const rangosOcupados = new Set(postulaciones.filter((p) => p.estado === "PENDIENTE").map((p) => p.rango));
  const rangosDisponibles = POSTULABLE_ROLES.filter((r) => !rangosOcupados.has(r));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Postulaciones</h1>
        <p className="text-sm text-text-muted">
          Postula para trabajar en el Departamento de Justicia. Solo puedes tener una postulación pendiente por
          rango a la vez.
        </p>
      </div>

      {rangosDisponibles.length > 0 && (
        <div className="space-y-3">
          {rangosDisponibles.map((r) => {
            const preguntasRango = preguntas.filter((p) => p.rango === r);
            return (
              <details key={r} className="rounded-lg border border-border bg-surface p-5">
                <summary className="cursor-pointer text-sm font-medium">
                  + Postular a {ROLE_LABELS[r]} · {ROLE_TIER_LABELS[r]}
                </summary>
                <form action={crearPostulacion} className="mt-4 space-y-3">
                  <input type="hidden" name="rango" value={r} />
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Motivación</label>
                    <textarea
                      name="motivacion"
                      required
                      rows={4}
                      placeholder="¿Por qué quieres formar parte del Departamento de Justicia en este rango?"
                      className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Experiencia (opcional)</label>
                    <textarea
                      name="experiencia"
                      rows={3}
                      placeholder="Experiencia previa relevante, dentro o fuera del rol"
                      className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  </div>
                  {preguntasRango.map((p) => (
                    <div key={p.id}>
                      <label className="block text-sm font-medium mb-1.5">{p.texto}</label>
                      <textarea
                        name={`pregunta_${p.id}`}
                        rows={3}
                        className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                      />
                    </div>
                  ))}
                  <button
                    type="submit"
                    className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
                  >
                    Enviar postulación
                  </button>
                </form>
              </details>
            );
          })}
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface divide-y divide-border">
        {postulaciones.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-text-muted">Aún no has enviado ninguna postulación.</p>
        )}
        {postulaciones.map((p) => (
          <div key={p.id} className="px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{ROLE_LABELS[p.rango]}</p>
                <p className="text-xs text-text-muted">
                  Enviada el {new Date(p.createdAt).toLocaleDateString("es-ES")}
                </p>
              </div>
              <StatusBadge
                label={ESTADO_POSTULACION_LABELS[p.estado]}
                className={ESTADO_POSTULACION_COLORS[p.estado]}
              />
            </div>
            <p className="mt-2 text-sm whitespace-pre-wrap">{p.motivacion}</p>
            {p.respuestasPreguntas.map((r) => (
              <p key={r.id} className="mt-2 text-sm">
                <span className="text-text-muted">{r.pregunta.texto}: </span>
                <span className="whitespace-pre-wrap">{r.respuesta}</span>
              </p>
            ))}
            {p.respuesta && (
              <p className="mt-2 text-sm rounded-md bg-surface-2 border border-border px-3 py-2 whitespace-pre-wrap">
                <span className="text-text-muted">Respuesta: </span>
                {p.respuesta}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
