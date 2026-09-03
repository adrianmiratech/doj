import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { ROLE_LABELS, ROLE_TIER_LABELS, STAFF_ROLES, TARIFA_HORA_MINIMA } from "@/lib/labels";
import { formatRangoFechas } from "@/lib/semanas";
import { actualizarNominaEnCurso } from "@/lib/nominas-auto";
import { tienePermiso } from "@/lib/permisos";
import { ejecutarCierreSemanal, marcarNominaPagada, reconocerNomina } from "@/lib/actions/nominas";
import { actualizarTarifaRango } from "@/lib/actions/tarifas";

function formatDinero(n: number) {
  return `$${n.toLocaleString("es-ES")}`;
}

export default async function NominasPage() {
  const session = await auth();
  const user = session!.user;
  const puedeGestionar = user.role === "JUEZ_SUPREMO" || (await tienePermiso(user.role, "GESTIONAR_NOMINAS"));

  await actualizarNominaEnCurso(prisma, user.id);
  if (puedeGestionar) {
    const staff = await prisma.user.findMany({
      where: { role: { in: STAFF_ROLES as unknown as string[] as never }, activo: true },
      select: { id: true },
    });
    for (const s of staff) await actualizarNominaEnCurso(prisma, s.id);
  }

  const [misNominas, todasLasNominas, perfil, tarifas] = await Promise.all([
    prisma.nomina.findMany({ where: { userId: user.id }, orderBy: { numeroSemana: "desc" } }),
    puedeGestionar
      ? prisma.nomina.findMany({ orderBy: { createdAt: "desc" }, include: { user: true } })
      : Promise.resolve([]),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        dni: true,
        legajo: true,
        cargo: true,
        role: true,
        contratosLaborales: {
          where: { estado: { in: ["ACTIVO", "PENDIENTE_FIRMA"] } },
          orderBy: { fechaInicio: "desc" },
          take: 1,
          select: { puesto: true },
        },
      },
    }),
    puedeGestionar ? prisma.tarifaRango.findMany() : Promise.resolve([]),
  ]);

  const tarifasPorRango = new Map(tarifas.map((t) => [t.role, t.tarifaHora]));

  const puesto = perfil?.contratosLaborales[0]?.puesto || perfil?.cargo || (perfil ? ROLE_TIER_LABELS[perfil.role] : "");

  const totalAcumulado = misNominas.reduce((acc, n) => acc + n.importe, 0);
  const pagadas = misNominas.filter((n) => n.pagada).length;
  const pendientes = misNominas.filter((n) => !n.pagada).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Mis Nóminas</h1>
        <p className="text-sm text-text-muted">
          Historial de pagos y nóminas semanales. Se generan solas cada semana según tus horas fichadas y tu
          tarifa/hora (definida en tu Contrato laboral).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wide">Total acumulado</p>
          <p className="text-xl font-semibold mt-1">{formatDinero(totalAcumulado)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wide">Pagadas</p>
          <p className="text-xl font-semibold mt-1 text-success">{pagadas}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wide">Pendientes</p>
          <p className="text-xl font-semibold mt-1 text-warning">{pendientes}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wide">Nóminas</p>
          <p className="text-xl font-semibold mt-1">{misNominas.length}</p>
        </div>
      </div>

      <div className="space-y-4">
        {misNominas.length === 0 && (
          <p className="rounded-lg border border-border bg-surface px-5 py-8 text-center text-sm text-text-muted">
            Aún no tienes nóminas. Se creará una automáticamente al empezar la semana.
          </p>
        )}
        {misNominas.map((n) => (
          <div key={n.id} className="rounded-lg border border-border bg-surface overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-surface-2 px-5 py-3.5">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-text-muted">
                  Recibo de nómina · Departamento de Justicia
                </p>
                <p className="text-base font-semibold mt-0.5">
                  Semana {n.numeroSemana}
                  {n.inicio && n.fin && (
                    <span className="text-sm font-normal text-text-muted"> · {formatRangoFechas(n.inicio, n.fin)}</span>
                  )}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <StatusBadge
                  label={n.acordada ? "Acordada" : "Pendiente acuerdo"}
                  className={
                    n.acordada
                      ? "bg-success/15 text-success border-success/30"
                      : "bg-warning/15 text-warning border-warning/30"
                  }
                />
                <StatusBadge
                  label={n.pagada ? "Pagada" : "Pendiente pago"}
                  className={
                    n.pagada
                      ? "bg-success/15 text-success border-success/30"
                      : "bg-danger/15 text-danger border-danger/30"
                  }
                />
              </div>
            </div>

            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs">
              <p>
                <span className="text-text-muted">Empleado: </span>
                <span className="font-medium">
                  {user.nombre} {user.apellidos}
                </span>
              </p>
              <p>
                <span className="text-text-muted">Nº Placa: </span>
                <span className="font-medium">#{perfil?.legajo ?? "—"}</span>
              </p>
              <p>
                <span className="text-text-muted">DNI: </span>
                <span className="font-medium">{perfil?.dni ?? "—"}</span>
              </p>
              <p>
                <span className="text-text-muted">Puesto: </span>
                <span className="font-medium">{puesto || "—"}</span>
              </p>
            </div>

            <div className="px-5 pb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-text-muted border-y border-border">
                    <th className="py-1.5 font-medium">Concepto</th>
                    <th className="py-1.5 font-medium text-right">Cantidad</th>
                    <th className="py-1.5 font-medium text-right">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/60">
                    <td className="py-1.5">Horas fichadas</td>
                    <td className="py-1.5 text-right">{n.horas.toFixed(1)} h</td>
                    <td className="py-1.5 text-right text-text-muted">× {formatDinero(n.tarifa)}/h</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold">Total a pagar</td>
                    <td></td>
                    <td className="py-2 text-right text-lg font-semibold">{formatDinero(n.importe)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {!n.acordada && (
              <div className="px-5 pb-4">
                <form action={reconocerNomina}>
                  <input type="hidden" name="id" value={n.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
                  >
                    Estoy de acuerdo
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>

      {puedeGestionar && (
        <div className="space-y-4 border-t border-border pt-6">
          <div>
            <h2 className="text-lg font-semibold">Tarifas por rango</h2>
            <p className="text-xs text-text-muted">
              El sueldo se define por rango, no por persona. Mínimo ${TARIFA_HORA_MINIMA}/h: nunca se puede cobrar
              $0.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface divide-y divide-border">
            {STAFF_ROLES.map((r) => (
              <form
                key={r}
                action={actualizarTarifaRango}
                className="flex items-center justify-between gap-3 px-5 py-2.5"
              >
                <input type="hidden" name="role" value={r} />
                <span className="text-sm font-medium">{ROLE_LABELS[r]}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">$</span>
                  <input
                    name="tarifaHora"
                    type="number"
                    min={TARIFA_HORA_MINIMA}
                    defaultValue={tarifasPorRango.get(r) ?? TARIFA_HORA_MINIMA}
                    className="w-24 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                  />
                  <span className="text-xs text-text-muted">/h</span>
                  <button
                    type="submit"
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2 transition-colors"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
            <div>
              <h2 className="text-lg font-semibold">Gestión de nóminas</h2>
              <p className="text-xs text-text-muted">
                El cierre semanal se ejecuta solo cada semana; usa este botón solo si necesitas forzarlo ahora
                (por ejemplo, para pruebas).
              </p>
            </div>
            <form action={ejecutarCierreSemanal}>
              <button
                type="submit"
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface-2 transition-colors"
              >
                Ejecutar cierre semanal ahora
              </button>
            </form>
          </div>

          <div className="rounded-lg border border-border bg-surface divide-y divide-border">
            {todasLasNominas.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-text-muted">Todavía no hay nóminas generadas.</p>
            )}
            {todasLasNominas.map((n) => (
              <div key={n.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {n.user.nombre} {n.user.apellidos} ({ROLE_LABELS[n.user.role]}) · Semana {n.numeroSemana}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatDinero(n.importe)} · {n.acordada ? "Acordada" : "Sin acordar"}
                  </p>
                </div>
                {!n.pagada ? (
                  <form action={marcarNominaPagada}>
                    <input type="hidden" name="id" value={n.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-success px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity shrink-0"
                    >
                      Marcar pagada
                    </button>
                  </form>
                ) : (
                  <StatusBadge label="Pagada" className="bg-success/15 text-success border-success/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
