import { Layers, Users, ShieldCheck, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS, ROLE_ORDER, ROLE_TIER_LABELS, STAFF_ROLES } from "@/lib/labels";
import { Avatar } from "@/components/avatar";
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
          <Star className="h-5 w-5 text-accent mb-1" />
          <p className="text-xl font-semibold">{mandos}</p>
          <p className="text-xs text-text-muted">Mandos</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <ShieldCheck className="h-5 w-5 text-success mb-1" />
          <p className="text-xl font-semibold text-success">{activos.length}</p>
          <p className="text-xs text-text-muted">Activos</p>
        </div>
      </div>

      <div className="space-y-6">
        {ROLE_ORDER.map((rango, i) => {
          const miembros = empleados.filter((e) => e.role === rango);
          if (miembros.length === 0) return null;
          const esMando = i < 2;
          return (
            <div
              key={rango}
              className={`rounded-lg border bg-surface overflow-hidden ${esMando ? "border-accent/40" : "border-border"}`}
            >
              <div
                className={`flex items-center justify-between px-5 py-3 border-l-4 ${
                  esMando ? "border-l-accent bg-accent/[0.06]" : "border-l-border"
                }`}
              >
                <div>
                  <p className="text-[11px] text-accent uppercase tracking-wider font-semibold">
                    {ROLE_TIER_LABELS[rango]}
                  </p>
                  <h2 className="text-base font-bold">{ROLE_LABELS[rango]}</h2>
                </div>
                <span className="text-xs text-text-muted shrink-0">{miembros.length} miembro(s)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4">
                {miembros.map((m) => (
                  <div key={m.id} className="rounded-md border border-border bg-surface-2 p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full border border-border shrink-0 overflow-hidden">
                        <Avatar url={m.avatarUrl} nombre={m.nombre} apellidos={m.apellidos} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {m.nombre} {m.apellidos}
                        </p>
                        <p className="text-xs text-text-muted font-mono">Placa #{m.legajo}</p>
                      </div>
                      <span
                        title={m.activo ? "Activo" : "Inactivo"}
                        className={`ml-auto h-2 w-2 rounded-full shrink-0 ${m.activo ? "bg-success" : "bg-text-muted"}`}
                      />
                    </div>
                    {m.cargo && <p className="mt-2 text-xs text-text-muted border-t border-border pt-2">{m.cargo}</p>}
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
