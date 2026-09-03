import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/labels";
import { inicioSemana } from "@/lib/fichaje";
import type { Role } from "@/generated/prisma/enums";

export default async function RankingPage() {
  const [empleados, fichajes] = await Promise.all([
    prisma.user.findMany({ where: { role: { in: STAFF_ROLES as unknown as Role[] }, activo: true } }),
    prisma.fichaje.findMany({ where: { entrada: { gte: inicioSemana() } } }),
  ]);

  const ahora = Date.now();
  const horasPorUsuario = new Map<string, number>();
  for (const f of fichajes) {
    const fin = f.salida ? f.salida.getTime() : ahora;
    const horas = (fin - f.entrada.getTime()) / 3600000;
    horasPorUsuario.set(f.userId, (horasPorUsuario.get(f.userId) ?? 0) + horas);
  }

  const ranking = empleados
    .map((e) => ({ user: e, horas: horasPorUsuario.get(e.id) ?? 0 }))
    .sort((a, b) => b.horas - a.horas);

  const maxHoras = Math.max(1, ...ranking.map((r) => r.horas));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Ranking de Personal</h1>
        <p className="text-sm text-text-muted">Rendimiento semanal comparativo, por horas de servicio.</p>
      </div>

      <div className="rounded-lg border border-border bg-surface divide-y divide-border">
        {ranking.map((r, i) => (
          <div key={r.user.id} className="flex items-center gap-4 px-5 py-3.5">
            <span className="w-5 text-sm text-text-muted text-right shrink-0">{i + 1}</span>
            <div className="h-8 w-8 rounded-full bg-surface-3 border border-border flex items-center justify-center text-xs font-semibold shrink-0">
              {r.user.nombre[0]}
              {r.user.apellidos[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {r.user.nombre} {r.user.apellidos}
              </p>
              <div className="mt-1.5 h-1.5 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full"
                  style={{ width: `${(r.horas / maxHoras) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-accent shrink-0">{r.horas.toFixed(1)}h</span>
          </div>
        ))}
      </div>
    </div>
  );
}
