import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { ESTADO_CASO_COLORS, ESTADO_CASO_LABELS } from "@/lib/labels";
import { agregarNotaCaso, cambiarEstadoCaso } from "@/lib/actions/casos";

export default async function MisJuiciosPage() {
  const session = await auth();
  const user = session!.user;
  if (user.role !== "JUEZ_SUPREMO" && user.role !== "JUEZ_DISTRITO") {
    redirect("/dashboard");
  }

  const audiencias = await prisma.audiencia.findMany({
    where: { juezId: user.id },
    orderBy: { fecha: "asc" },
    include: {
      caso: {
        include: {
          notas: { orderBy: { createdAt: "desc" }, take: 3, include: { autor: true } },
          audiencias: { orderBy: { fecha: "asc" } },
        },
      },
    },
  });

  const casosPorId = new Map<string, (typeof audiencias)[number]["caso"]>();
  for (const a of audiencias) casosPorId.set(a.caso.id, a.caso);
  const casos = Array.from(casosPorId.values());
  const ahora = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Mis Juicios</h1>
        <p className="text-sm text-text-muted">
          Expedientes en los que presides audiencias: cambia el estado, añade notas o consulta el expediente completo.
        </p>
      </div>

      <div className="space-y-4">
        {casos.length === 0 && (
          <p className="rounded-lg border border-border bg-surface px-5 py-8 text-center text-sm text-text-muted">
            No presides ninguna audiencia todavía.
          </p>
        )}
        {casos.map((caso) => {
          const proxima = caso.audiencias.find((a) => a.fecha >= ahora);
          return (
            <div key={caso.id} className="rounded-lg border border-border bg-surface p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/dashboard/casos/${caso.id}`} className="text-sm font-semibold hover:text-accent">
                    {caso.titulo}
                  </Link>
                  <p className="text-xs text-text-muted mt-0.5">
                    {caso.expediente} · {caso.tipo}
                    {proxima
                      ? ` · Próxima audiencia: ${proxima.fecha.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}`
                      : ""}
                  </p>
                </div>
                <StatusBadge label={ESTADO_CASO_LABELS[caso.estado]} className={ESTADO_CASO_COLORS[caso.estado]} />
              </div>

              {caso.notas.length > 0 && (
                <div className="space-y-1.5">
                  {caso.notas.map((n) => (
                    <p key={n.id} className="text-xs rounded-md bg-surface-2 border border-border px-3 py-2 whitespace-pre-wrap">
                      <span className="text-text-muted">{n.autor.nombre}: </span>
                      {n.contenido}
                    </p>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <form action={cambiarEstadoCaso} className="flex gap-2">
                  <input type="hidden" name="id" value={caso.id} />
                  <select
                    name="estado"
                    defaultValue={caso.estado}
                    className="flex-1 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                  >
                    {Object.entries(ESTADO_CASO_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2 transition-colors shrink-0"
                  >
                    Cambiar estado
                  </button>
                </form>

                <form action={agregarNotaCaso} className="flex gap-2">
                  <input type="hidden" name="casoId" value={caso.id} />
                  <input
                    name="contenido"
                    required
                    placeholder="Añadir nota / resolución"
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
