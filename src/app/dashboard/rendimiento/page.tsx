import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES, ROLE_LABELS } from "@/lib/labels";
import { formatDuracion, horasSemanaMs, inicioSemana } from "@/lib/fichaje";

const HACE_30_DIAS = () => new Date(Date.now() - 30 * 86400000);

export default async function RendimientoPage() {
  const session = await auth();
  if (session?.user.role !== "JUEZ_SUPREMO") {
    redirect("/dashboard");
  }

  const empleados = await prisma.user.findMany({
    where: { role: { in: STAFF_ROLES as unknown as ("JUEZ_SUPREMO" | "JUEZ_DISTRITO")[] } },
    orderBy: [{ role: "asc" }, { nombre: "asc" }],
    include: {
      fichajes: true,
      faltasRecibidas: { where: { estado: "PENDIENTE" } },
      medallaProgresos: { where: { conseguida: true } },
    },
  });

  const accesos = await prisma.accesoLog.groupBy({
    by: ["userId"],
    where: { exito: true, createdAt: { gte: HACE_30_DIAS() }, userId: { not: null } },
    _count: { userId: true },
  });
  const accesosPorUsuario = new Map(accesos.map((a) => [a.userId, a._count.userId]));

  const inicio = inicioSemana();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Rendimiento de empleados</h1>
        <p className="text-sm text-text-muted">
          Horas de servicio (según fichajes), actividad reciente en el portal, faltas activas y condecoraciones
          por empleado. Solo visible para el Juez Supremo.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-muted uppercase tracking-wide">
              <th className="px-5 py-3 font-medium">Empleado</th>
              <th className="px-3 py-3 font-medium">Rango</th>
              <th className="px-3 py-3 font-medium">Horas totales</th>
              <th className="px-3 py-3 font-medium">Esta semana</th>
              <th className="px-3 py-3 font-medium">Accesos (30d)</th>
              <th className="px-3 py-3 font-medium">Último acceso</th>
              <th className="px-3 py-3 font-medium">Faltas activas</th>
              <th className="px-3 py-3 font-medium">Condecoraciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {empleados.map((e) => {
              const horasTotales = horasSemanaMs(e.fichajes);
              const horasSemana = horasSemanaMs(e.fichajes.filter((f) => f.entrada >= inicio));
              return (
                <tr key={e.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium">
                      {e.nombre} {e.apellidos}
                    </p>
                    <p className="text-xs text-text-muted">{e.legajo ? `#${e.legajo}` : "—"}</p>
                  </td>
                  <td className="px-3 py-3 text-xs">{ROLE_LABELS[e.role] ?? e.role}</td>
                  <td className="px-3 py-3">{formatDuracion(horasTotales)}</td>
                  <td className="px-3 py-3">{formatDuracion(horasSemana)}</td>
                  <td className="px-3 py-3">{accesosPorUsuario.get(e.id) ?? 0}</td>
                  <td className="px-3 py-3 text-xs text-text-muted">
                    {e.ultimoAcceso ? new Date(e.ultimoAcceso).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "Nunca"}
                  </td>
                  <td className="px-3 py-3">
                    {e.faltasRecibidas.length > 0 ? (
                      <span className="text-warning font-medium">{e.faltasRecibidas.length}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="px-3 py-3">{e.medallaProgresos.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
