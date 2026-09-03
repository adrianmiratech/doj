import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS, ROLE_TIER_LABELS, STAFF_ROLES } from "@/lib/labels";
import { actualizarContratoLaboral, crearContratoLaboral, reenviarContratoLaboral } from "@/lib/actions/contratos-laborales";
import { FirmarContratoForm } from "./firmar-contrato-form";
import type { Role } from "@/generated/prisma/enums";

export default async function MiContratoPage() {
  const session = await auth();
  const user = session!.user;
  const esJuezSupremo = user.role === "JUEZ_SUPREMO";

  const [me, contratos, todosLosContratos, personal] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
    prisma.contratoLaboral.findMany({ where: { userId: user.id }, orderBy: { fechaInicio: "desc" } }),
    esJuezSupremo
      ? prisma.contratoLaboral.findMany({
          where: { user: { role: { in: STAFF_ROLES as unknown as Role[] } } },
          orderBy: { fechaInicio: "desc" },
          include: { user: true },
        })
      : Promise.resolve([]),
    esJuezSupremo
      ? prisma.user.findMany({
          where: { role: { in: STAFF_ROLES as unknown as Role[] }, activo: true },
          orderBy: { nombre: "asc" },
          select: { id: true, nombre: true, apellidos: true },
        })
      : Promise.resolve([]),
  ]);

  const ESTADO_LABEL: Record<string, string> = {
    PENDIENTE_FIRMA: "Pendiente de firma",
    ACTIVO: "Activo",
    FINALIZADO: "Finalizado",
  };
  const ESTADO_COLOR: Record<string, string> = {
    PENDIENTE_FIRMA: "bg-warning/15 text-warning border-warning/30",
    ACTIVO: "bg-success/15 text-success border-success/30",
    FINALIZADO: "bg-surface-3 text-text-muted border-border",
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Contrato laboral</h1>
        <p className="text-sm text-text-muted">Tu vinculación con el Departamento de Justicia.</p>
      </div>

      {contratos.length === 0 && (
        <p className="rounded-lg border border-border bg-surface px-5 py-8 text-center text-sm text-text-muted">
          No tienes ningún contrato registrado todavía.
        </p>
      )}

      {contratos.map((c) => (
        <div
          key={c.id}
          className={`rounded-lg border p-5 space-y-3 ${
            c.estado === "PENDIENTE_FIRMA" ? "border-warning/40 bg-warning/5" : "border-border bg-surface"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{c.puesto}</p>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${ESTADO_COLOR[c.estado]}`}
            >
              {ESTADO_LABEL[c.estado]}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wide">Nombre</p>
              <p className="font-medium">
                {me.nombre} {me.apellidos}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wide">Nº de placa</p>
              <p className="font-medium">#{me.legajo}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wide">Rango</p>
              <p className="font-medium">{ROLE_LABELS[user.role]}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wide">Rol administrativo</p>
              <p className="font-medium">{ROLE_TIER_LABELS[user.role]}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wide">Tarifa por hora</p>
              <p className="font-medium">${c.salarioBase.toLocaleString("es-ES")}/h</p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wide">Inicio</p>
              <p className="font-medium">{c.fechaInicio.toLocaleDateString("es-ES")}</p>
            </div>
          </div>
          {c.condiciones && (
            <p className="text-sm text-text-muted border-t border-border pt-3">{c.condiciones}</p>
          )}

          {c.estado === "PENDIENTE_FIRMA" && (
            <div className="border-t border-warning/30 pt-4">
              <p className="text-sm text-warning font-medium mb-3">
                Este contrato está pendiente de tu firma. Revisa los datos anteriores y confírmalos con tu
                contraseña.
              </p>
              <FirmarContratoForm contratoId={c.id} />
            </div>
          )}
        </div>
      ))}

      {esJuezSupremo && (
        <div className="space-y-4 border-t border-border pt-6">
          <h2 className="text-lg font-semibold">Contratos del personal (Juez Supremo)</h2>

          <details className="rounded-lg border border-border bg-surface p-5">
            <summary className="cursor-pointer text-sm font-medium">+ Enviar nuevo contrato</summary>
            <form action={crearContratoLaboral} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                name="userId"
                required
                defaultValue=""
                className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="" disabled>
                  Empleado…
                </option>
                {personal.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} {p.apellidos}
                  </option>
                ))}
              </select>
              <input
                name="puesto"
                required
                placeholder="Puesto"
                className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <input
                name="salarioBase"
                type="number"
                min={1}
                required
                placeholder="Tarifa por hora ($/h)"
                className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <input
                name="condiciones"
                placeholder="Condiciones (opcional)"
                className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="sm:col-span-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors w-fit"
              >
                Enviar contrato
              </button>
            </form>
          </details>

          <div className="space-y-3">
            {todosLosContratos.map((c) => (
              <details key={c.id} className="rounded-lg border border-border bg-surface p-5">
                <summary className="cursor-pointer flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">
                    {c.user.nombre} {c.user.apellidos} · {c.puesto}
                  </span>
                  <span className="text-xs text-text-muted">
                    ${c.salarioBase.toLocaleString("es-ES")}/h · {ESTADO_LABEL[c.estado]}
                  </span>
                </summary>
                <form
                  action={actualizarContratoLaboral}
                  className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  <input type="hidden" name="id" value={c.id} />
                  <input
                    name="puesto"
                    defaultValue={c.puesto}
                    required
                    placeholder="Puesto"
                    className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  <input
                    name="salarioBase"
                    type="number"
                    min={0}
                    defaultValue={c.salarioBase}
                    required
                    placeholder="Tarifa por hora ($/h)"
                    className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  <select
                    name="estado"
                    defaultValue={c.estado}
                    className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                  >
                    <option value="PENDIENTE_FIRMA">Pendiente de firma</option>
                    <option value="ACTIVO">Activo</option>
                    <option value="FINALIZADO">Finalizado</option>
                  </select>
                  <input
                    name="condiciones"
                    defaultValue={c.condiciones ?? ""}
                    placeholder="Condiciones (opcional)"
                    className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors w-fit"
                  >
                    Guardar
                  </button>
                </form>
                <form action={reenviarContratoLaboral} className="mt-2">
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface-2 transition-colors w-fit"
                  >
                    Reenviar notificación
                  </button>
                </form>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
