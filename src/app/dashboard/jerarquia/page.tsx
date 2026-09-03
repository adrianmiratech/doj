import { Layers, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS, ROLE_ORDER, ROLE_TIER_LABELS, STAFF_ROLES } from "@/lib/labels";
import type { Role } from "@/generated/prisma/enums";

export default async function JerarquiaPage() {
  const empleados = await prisma.user.findMany({
    where: { role: { in: STAFF_ROLES as unknown as Role[] } },
    orderBy: { nombre: "asc" },
  });

  const activos = empleados.filter((e) => e.activo);
  const rangosOcupados = new Set(empleados.map((e) => e.role)).size;
  const mandos = empleados.filter((e) => e.role === "JUEZ_SUPREMO" || e.role === "JUEZ_DISTRITO").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Escala Jerárquica</h1>
        <p className="text-sm text-text-muted">Estructura completa del Departamento de Justicia.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-surface p-4">
          <Users className="h-5 w-5 text-accent mb-1" />
          <p className="text-xl font-semibold">{empleados.length}</p>
          <p className="text-xs text-text-muted">Empleados totales</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <Layers className="h-5 w-5 text-accent mb-1" />
          <p className="text-xl font-semibold">{rangosOcupados}</p>
          <p className="text-xs text-text-muted">Rangos ocupados</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xl font-semibold">{mandos}</p>
          <p className="text-xs text-text-muted">Mandos</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xl font-semibold text-success">{activos.length}</p>
          <p className="text-xs text-text-muted">Activos</p>
        </div>
      </div>

      <div className="space-y-8">
        {ROLE_ORDER.map((rango) => {
          const miembros = empleados.filter((e) => e.role === rango);
          if (miembros.length === 0) return null;
          return (
            <div key={rango}>
              <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
                <div>
                  <p className="text-xs text-accent uppercase tracking-wider font-semibold">
                    {ROLE_TIER_LABELS[rango]}
                  </p>
                  <h2 className="text-lg font-semibold">{ROLE_LABELS[rango]}</h2>
                </div>
                <span className="text-sm text-text-muted">{miembros.length} miembro(s)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {miembros.map((m) => (
                  <div key={m.id} className="rounded-lg border border-border bg-surface p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-surface-3 border border-border flex items-center justify-center text-xs font-semibold shrink-0">
                        {m.nombre[0]}
                        {m.apellidos[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {m.nombre} {m.apellidos}
                        </p>
                        <p className="text-xs text-text-muted">Placa #{m.legajo}</p>
                      </div>
                      <span
                        className={`ml-auto h-2 w-2 rounded-full shrink-0 ${m.activo ? "bg-success" : "bg-text-muted"}`}
                      />
                    </div>
                    {m.cargo && <p className="mt-2 text-xs text-text-muted">{m.cargo}</p>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
