import { ClipboardCheck } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { ESTADO_EXAMEN_COLORS, ESTADO_EXAMEN_LABELS, STAFF_ROLES } from "@/lib/labels";
import { alternarActivoPlantilla, asignarExamen, calificarExamen, crearPlantillaExamen } from "@/lib/actions/examenes";
import type { Role } from "@/generated/prisma/enums";

export default async function ExamenesPage() {
  const session = await auth();
  const user = session!.user;
  const esJuezSupremo = user.role === "JUEZ_SUPREMO";

  const [misExamenes, empleados, plantillas, todosLosExamenes] = await Promise.all([
    prisma.examen.findMany({
      where: { empleadoId: user.id },
      orderBy: { createdAt: "desc" },
      include: { asignadoPor: true, plantilla: true },
    }),
    esJuezSupremo
      ? prisma.user.findMany({ where: { role: { in: STAFF_ROLES as unknown as Role[] } } })
      : Promise.resolve([]),
    esJuezSupremo
      ? prisma.plantillaExamen.findMany({ orderBy: { titulo: "asc" } })
      : Promise.resolve([]),
    esJuezSupremo
      ? prisma.examen.findMany({ orderBy: { createdAt: "desc" }, include: { empleado: true } })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Mis Exámenes</h1>
        <p className="text-sm text-text-muted">Exámenes asignados a tu perfil y tus resultados.</p>
      </div>

      <div className="rounded-lg border border-border bg-surface">
        {misExamenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ClipboardCheck className="h-10 w-10 text-text-muted" />
            <p className="text-sm font-semibold">No tienes exámenes asignados</p>
            <p className="text-xs text-text-muted">Cuando el Juez Supremo te asigne un examen, aparecerá aquí.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {misExamenes.map((ex) => (
              <li key={ex.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{ex.titulo}</p>
                    <p className="text-xs text-text-muted mt-0.5 whitespace-pre-wrap">{ex.descripcion}</p>
                    <p className="text-xs text-text-muted mt-1">
                      Asignado por {ex.asignadoPor.nombre} {ex.asignadoPor.apellidos} ·{" "}
                      {new Date(ex.createdAt).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <StatusBadge label={ESTADO_EXAMEN_LABELS[ex.estado]} className={ESTADO_EXAMEN_COLORS[ex.estado]} />
                </div>
                {ex.plantilla && (
                  <ol className="list-decimal list-inside text-sm space-y-1 mt-3 rounded-md bg-surface-2 border border-border px-3 py-2">
                    {ex.plantilla.preguntas.split("\n").filter(Boolean).map((preg, i) => (
                      <li key={i}>{preg}</li>
                    ))}
                  </ol>
                )}
                {ex.resultado && (
                  <p className="mt-2 text-sm rounded-md bg-surface-2 border border-border px-3 py-2 whitespace-pre-wrap">
                    {ex.resultado}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {esJuezSupremo && (
        <div className="space-y-6 border-t border-border pt-6">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Plantillas de examen (Juez Supremo)</h2>
            <details className="rounded-lg border border-border bg-surface p-5">
              <summary className="cursor-pointer text-sm font-medium">+ Nueva plantilla</summary>
              <form action={crearPlantillaExamen} className="mt-4 space-y-3">
                <input
                  name="titulo"
                  required
                  placeholder="Título de la plantilla"
                  className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <textarea
                  name="descripcion"
                  rows={2}
                  placeholder="Descripción / instrucciones generales"
                  className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <textarea
                  name="preguntas"
                  required
                  rows={6}
                  placeholder={"Preguntas, una por línea. Ej:\n¿Cuál es el procedimiento para solicitar una orden de allanamiento?\n¿Qué artículo regula la conducción temeraria?"}
                  className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
                >
                  Crear plantilla
                </button>
              </form>
            </details>

            <div className="rounded-lg border border-border bg-surface divide-y divide-border">
              {plantillas.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-text-muted">No hay plantillas todavía.</p>
              )}
              {plantillas.map((p) => (
                <details key={p.id} className="px-5 py-4">
                  <summary className="cursor-pointer flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{p.titulo}</span>
                    <span
                      className={`text-xs rounded-full border px-2 py-0.5 font-medium ${
                        p.activo
                          ? "bg-success/15 text-success border-success/30"
                          : "bg-surface-3 text-text-muted border-border"
                      }`}
                    >
                      {p.activo ? "Activa" : "Inactiva"}
                    </span>
                  </summary>
                  <div className="mt-3 space-y-3">
                    {p.descripcion && <p className="text-sm text-text-muted whitespace-pre-wrap">{p.descripcion}</p>}
                    <ol className="list-decimal list-inside text-sm space-y-1">
                      {p.preguntas.split("\n").filter(Boolean).map((preg, i) => (
                        <li key={i}>{preg}</li>
                      ))}
                    </ol>
                    <form action={alternarActivoPlantilla}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2 transition-colors"
                      >
                        {p.activo ? "Desactivar" : "Reactivar"}
                      </button>
                    </form>
                  </div>
                </details>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Asignar examen</h2>
            <form action={asignarExamen} className="rounded-lg border border-border bg-surface p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                name="empleadoId"
                required
                defaultValue=""
                className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="" disabled>
                  Empleado
                </option>
                {empleados.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre} {e.apellidos}
                  </option>
                ))}
              </select>
              <select
                name="plantillaId"
                required
                defaultValue=""
                className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="" disabled>
                  Plantilla
                </option>
                {plantillas
                  .filter((p) => p.activo)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.titulo}
                    </option>
                  ))}
              </select>
              <button
                type="submit"
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
              >
                Asignar
              </button>
            </form>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Exámenes asignados</h2>
            <div className="rounded-lg border border-border bg-surface divide-y divide-border">
              {todosLosExamenes.map((ex) => (
                <div key={ex.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">
                      {ex.empleado.nombre} {ex.empleado.apellidos} · {ex.titulo}
                    </p>
                    <StatusBadge label={ESTADO_EXAMEN_LABELS[ex.estado]} className={ESTADO_EXAMEN_COLORS[ex.estado]} />
                  </div>
                  {ex.estado === "PENDIENTE" && (
                    <form
                      action={calificarExamen}
                      className="mt-3 grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-2"
                    >
                      <input type="hidden" name="id" value={ex.id} />
                      <select
                        name="estado"
                        defaultValue="APROBADO"
                        className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                      >
                        <option value="APROBADO">Aprobado</option>
                        <option value="SUSPENDIDO">Suspendido</option>
                      </select>
                      <input
                        name="resultado"
                        placeholder="Comentario / nota"
                        className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
                      >
                        Calificar
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
