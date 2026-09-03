import { Award } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/labels";
import { ajustarProgresoMedalla } from "@/lib/actions/condecoraciones";
import type { Role } from "@/generated/prisma/enums";

export default async function CondecoracionesPage() {
  const session = await auth();
  const user = session!.user;
  const esJuezSupremo = user.role === "JUEZ_SUPREMO";

  const [medallas, empleados] = await Promise.all([
    prisma.medalla.findMany({
      orderBy: { nombre: "asc" },
      include: { progresos: { where: { userId: user.id } } },
    }),
    esJuezSupremo
      ? prisma.user.findMany({ where: { role: { in: STAFF_ROLES as unknown as Role[] } } })
      : Promise.resolve([]),
  ]);

  const conseguidas = medallas.filter((m) => m.progresos[0]?.conseguida).length;
  const enProgreso = medallas.filter((m) => m.progresos[0] && !m.progresos[0].conseguida).length;

  const categorias = Array.from(new Set(medallas.map((m) => m.categoria)));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Condecoraciones</h1>
          <p className="text-sm text-text-muted">Todas las distinciones del Departamento y tu progreso real.</p>
        </div>
        <div className="flex gap-4 text-center">
          <div>
            <p className="text-xl font-semibold text-success">{conseguidas}</p>
            <p className="text-xs text-text-muted">Conseguidas</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-warning">{enProgreso}</p>
            <p className="text-xs text-text-muted">En progreso</p>
          </div>
          <div>
            <p className="text-xl font-semibold">{medallas.length}</p>
            <p className="text-xs text-text-muted">Totales</p>
          </div>
        </div>
      </div>

      {categorias.map((cat) => (
        <div key={cat}>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-accent" />
            {cat}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {medallas
              .filter((m) => m.categoria === cat)
              .map((m) => {
                const progreso = m.progresos[0]?.progreso ?? 0;
                const conseguida = m.progresos[0]?.conseguida ?? false;
                const pct = Math.min(100, Math.round((progreso / m.objetivo) * 100));
                return (
                  <div key={m.id} className="rounded-lg border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{m.nombre}</p>
                      {conseguida && (
                        <span className="text-xs shrink-0 rounded-full border border-success/30 bg-success/15 px-2 py-0.5 text-success font-medium">
                          Conseguida
                        </span>
                      )}
                    </div>
                    {m.bonoNomina > 0 && (
                      <p className="text-xs text-accent mt-1">+${m.bonoNomina.toLocaleString("es-ES")} en nómina</p>
                    )}
                    <p className="text-xs text-text-muted mt-2">{m.descripcion}</p>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-text-muted mb-1">
                        <span>Tu progreso</span>
                        <span>
                          {progreso}/{m.objetivo} · {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      {esJuezSupremo && (
        <div className="space-y-3 border-t border-border pt-6">
          <h2 className="text-lg font-semibold">Ajustar progreso (Juez Supremo)</h2>
          <form action={ajustarProgresoMedalla} className="rounded-lg border border-border bg-surface p-5 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select
              name="userId"
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
              name="medallaId"
              required
              defaultValue=""
              className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="" disabled>
                Medalla
              </option>
              {medallas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
            <input
              name="progreso"
              type="number"
              min={0}
              required
              placeholder="Progreso"
              className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
            >
              Guardar progreso
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
