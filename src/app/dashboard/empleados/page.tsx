import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatUltimoAcceso } from "@/lib/fecha";
import { Avatar } from "@/components/avatar";
import {
  ESTADO_FALTA_COLORS,
  ESTADO_FALTA_LABELS,
  GRAVEDAD_COLORS,
  GRAVEDAD_LABELS,
  ROLE_LABELS,
  ROLE_ORDER,
  ROLE_TIER_LABELS,
  STAFF_ROLES,
} from "@/lib/labels";
import { tienePermiso } from "@/lib/permisos";
import {
  ajustarHorasEmpleado,
  alternarActivoEmpleado,
  asignarContratoEmpleado,
  cambiarLegajoEmpleado,
  cambiarRangoEmpleado,
  crearEmpleado,
  eliminarEmpleado,
  imponerFalta,
  quitarSuspensionEmpleado,
  resetearPasswordEmpleado,
  subirFotoEmpleado,
  suspenderEmpleadoTemporal,
} from "@/lib/actions/empleados";
import { ajustarProgresoMedalla } from "@/lib/actions/condecoraciones";
import type { Role } from "@/generated/prisma/enums";

export default async function EmpleadosPage() {
  const session = await auth();
  const puedeGestionar =
    session?.user.role === "JUEZ_SUPREMO" || (session ? await tienePermiso(session.user.role, "GESTIONAR_EMPLEADOS") : false);
  if (!puedeGestionar) {
    redirect("/dashboard");
  }

  const [empleadosRaw, medallas] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: STAFF_ROLES as unknown as Role[] } },
      include: {
        faltasRecibidas: { orderBy: { createdAt: "desc" } },
        contratosLaborales: { where: { estado: { in: ["ACTIVO", "PENDIENTE_FIRMA"] } } },
        medallaProgresos: true,
      },
    }),
    prisma.medalla.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  const empleados = empleadosRaw.sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
  const ahora = Date.now();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Empleados del Departamento</h1>
        <p className="text-sm text-text-muted">
          Gestión de cuentas del personal gubernamental. El sueldo se define por rango en Nóminas, no por persona.
        </p>
      </div>

      <details className="rounded-lg border border-border bg-surface p-5">
        <summary className="cursor-pointer text-sm font-medium">+ Registrar nuevo empleado</summary>
        <form action={crearEmpleado} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            name="nombre"
            required
            placeholder="Nombre"
            className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            name="apellidos"
            required
            placeholder="Apellidos"
            className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            name="dni"
            placeholder="DNI del personaje (opcional)"
            className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <select
            name="role"
            required
            defaultValue=""
            className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="" disabled>
              Rango
            </option>
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]} · {ROLE_TIER_LABELS[r]}
              </option>
            ))}
          </select>
          <input
            name="cargo"
            placeholder="Destino / especialidad (opcional, ej. Sala 2)"
            className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            name="discordId"
            placeholder="ID de Discord (opcional, para notificaciones)"
            className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent font-mono"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="Correo institucional"
            className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Contraseña temporal (mín. 6 caracteres)"
            className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="sm:col-span-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors w-fit"
          >
            Crear cuenta
          </button>
        </form>
      </details>

      <div className="rounded-lg border border-border bg-surface divide-y divide-border">
        {empleados.map((e) => {
          const faltasPendientes = e.faltasRecibidas.filter((f) => f.estado === "PENDIENTE");
          const suspendidoTemporal = e.suspendidoHasta && e.suspendidoHasta.getTime() > ahora;
          const sinContrato = e.contratosLaborales.length === 0;
          return (
            <details key={e.id} className="group px-5 py-3.5">
              <summary className="flex flex-wrap items-center justify-between gap-3 cursor-pointer list-none">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full border border-border shrink-0 overflow-hidden">
                    <Avatar url={e.avatarUrl} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {e.nombre} {e.apellidos}{" "}
                      <span className="text-xs text-text-muted font-normal">· Placa #{e.legajo}</span>
                    </p>
                    <p className="text-xs text-text-muted">
                      {ROLE_LABELS[e.role]} ({ROLE_TIER_LABELS[e.role]})
                      {e.cargo ? ` · ${e.cargo}` : ""} · {e.email}
                    </p>
                    <p className="text-xs text-text-muted">Último acceso: {formatUltimoAcceso(e.ultimoAcceso)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {faltasPendientes.length > 0 && (
                    <span className="inline-flex items-center rounded-full border border-danger/30 bg-danger/15 px-2.5 py-0.5 text-xs font-medium text-danger">
                      {faltasPendientes.length} falta(s) sin reconocer
                    </span>
                  )}
                  {sinContrato && (
                    <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/15 px-2.5 py-0.5 text-xs font-medium text-warning">
                      Sin contrato
                    </span>
                  )}
                  {suspendidoTemporal && (
                    <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/15 px-2.5 py-0.5 text-xs font-medium text-warning">
                      Suspendido hasta {e.suspendidoHasta!.toLocaleDateString("es-ES")}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      e.activo
                        ? "bg-success/15 text-success border-success/30"
                        : "bg-surface-3 text-text-muted border-border"
                    }`}
                  >
                    {e.activo ? "Activo" : "Inhabilitado"}
                  </span>
                </div>
              </summary>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3 border-t border-border pt-4">
                <FieldGroup titulo="Rango y placa">
                  <form action={cambiarRangoEmpleado} className="space-y-1.5">
                    <input type="hidden" name="id" value={e.id} />
                    <label className="block text-xs text-text-muted">Rango</label>
                    <div className="flex gap-2">
                      <select
                        name="role"
                        defaultValue={e.role}
                        className="flex-1 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                      >
                        {STAFF_ROLES.filter((r) => r !== "JUEZ_SUPREMO").map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                      <SmallButton>Cambiar</SmallButton>
                    </div>
                  </form>

                  <form action={cambiarLegajoEmpleado} className="space-y-1.5">
                    <input type="hidden" name="id" value={e.id} />
                    <label className="block text-xs text-text-muted">Nº de placa</label>
                    <div className="flex gap-2">
                      <input
                        name="legajo"
                        defaultValue={e.legajo ?? ""}
                        className="flex-1 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                      />
                      <SmallButton>Cambiar</SmallButton>
                    </div>
                  </form>

                  {sinContrato && (
                    <form action={asignarContratoEmpleado} className="space-y-1.5">
                      <input type="hidden" name="id" value={e.id} />
                      <label className="block text-xs text-text-muted">Puesto (contrato faltante)</label>
                      <div className="flex gap-2">
                        <input
                          name="puesto"
                          placeholder="Opcional"
                          className="flex-1 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                        />
                        <SmallButton destacado>Asignar contrato</SmallButton>
                      </div>
                    </form>
                  )}
                </FieldGroup>

                <FieldGroup titulo="Foto de perfil">
                  <form action={subirFotoEmpleado} className="space-y-1.5" encType="multipart/form-data">
                    <input type="hidden" name="id" value={e.id} />
                    <input
                      name="foto"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="block w-full text-xs text-text-muted file:mr-2 file:rounded-md file:border file:border-border file:bg-surface-2 file:px-2.5 file:py-1.5 file:text-xs file:font-medium"
                    />
                    <SmallButton>Subir foto</SmallButton>
                  </form>
                </FieldGroup>

                <FieldGroup titulo="Ajustar horas fichadas">
                  <form action={ajustarHorasEmpleado} className="space-y-1.5">
                    <input type="hidden" name="userId" value={e.id} />
                    <div className="flex gap-2">
                      <input
                        name="minutos"
                        type="number"
                        placeholder="± minutos"
                        className="w-28 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                      />
                      <input
                        name="motivo"
                        required
                        placeholder="Motivo"
                        className="flex-1 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                      />
                    </div>
                    <SmallButton>Ajustar</SmallButton>
                  </form>
                </FieldGroup>

                <FieldGroup titulo="Faltas">
                  {e.faltasRecibidas.length > 0 && (
                    <ul className="space-y-1.5">
                      {e.faltasRecibidas.map((f) => (
                        <li
                          key={f.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 text-xs"
                        >
                          <div className="min-w-0">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 mr-2 font-medium ${GRAVEDAD_COLORS[f.gravedad]}`}
                            >
                              {GRAVEDAD_LABELS[f.gravedad]}
                            </span>
                            {f.motivo}
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium shrink-0 ${ESTADO_FALTA_COLORS[f.estado]}`}
                          >
                            {ESTADO_FALTA_LABELS[f.estado]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <form action={imponerFalta} className="space-y-1.5">
                    <input type="hidden" name="empleadoId" value={e.id} />
                    <div className="flex gap-2">
                      <select
                        name="gravedad"
                        defaultValue="LEVE"
                        className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                      >
                        {Object.entries(GRAVEDAD_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <input
                        name="motivo"
                        required
                        placeholder="Motivo de la sanción"
                        className="flex-1 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                      />
                    </div>
                    <button
                      type="submit"
                      className="rounded-md bg-danger px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                    >
                      Imponer falta
                    </button>
                  </form>
                </FieldGroup>

                <FieldGroup titulo="Condecoraciones">
                  <ul className="space-y-1.5">
                    {medallas.map((m) => {
                      const progresoActual = e.medallaProgresos.find((mp) => mp.medallaId === m.id);
                      return (
                        <li key={m.id} className="flex items-center gap-2 text-xs">
                          <span className={`flex-1 truncate ${progresoActual?.conseguida ? "text-accent font-medium" : "text-text-muted"}`}>
                            {progresoActual?.conseguida ? "🏅 " : ""}
                            {m.nombre}
                          </span>
                          <form action={ajustarProgresoMedalla} className="flex items-center gap-1 shrink-0">
                            <input type="hidden" name="userId" value={e.id} />
                            <input type="hidden" name="medallaId" value={m.id} />
                            <input
                              name="progreso"
                              type="number"
                              min={0}
                              max={m.objetivo}
                              defaultValue={progresoActual?.progreso ?? 0}
                              className="w-14 rounded-md border border-border bg-surface-2 px-1.5 py-1 text-xs outline-none focus:border-accent"
                            />
                            <span className="text-text-muted">/ {m.objetivo}</span>
                            <SmallButton>Guardar</SmallButton>
                          </form>
                        </li>
                      );
                    })}
                    {medallas.length === 0 && <li className="text-xs text-text-muted">No hay condecoraciones creadas todavía.</li>}
                  </ul>
                </FieldGroup>

                <FieldGroup titulo="Acceso a la cuenta" className="lg:col-span-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={alternarActivoEmpleado}>
                      <input type="hidden" name="id" value={e.id} />
                      <SmallButton>{e.activo ? "Inhabilitar permanentemente" : "Reactivar cuenta"}</SmallButton>
                    </form>

                    {e.activo && (
                      <form action={suspenderEmpleadoTemporal} className="flex items-center gap-1.5">
                        <input type="hidden" name="id" value={e.id} />
                        <input
                          name="dias"
                          type="number"
                          min={1}
                          placeholder="Días"
                          className="w-16 rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs outline-none focus:border-accent"
                        />
                        <SmallButton>Suspender temporalmente</SmallButton>
                      </form>
                    )}

                    {suspendidoTemporal && (
                      <form action={quitarSuspensionEmpleado}>
                        <input type="hidden" name="id" value={e.id} />
                        <SmallButton>Quitar suspensión</SmallButton>
                      </form>
                    )}

                    <form action={resetearPasswordEmpleado}>
                      <input type="hidden" name="id" value={e.id} />
                      <SmallButton>Resetear contraseña</SmallButton>
                    </form>

                    <form action={eliminarEmpleado} className="ml-auto">
                      <input type="hidden" name="id" value={e.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-danger/30 text-danger px-3 py-1.5 text-xs font-medium hover:bg-danger/10 transition-colors"
                      >
                        Eliminar cuenta
                      </button>
                    </form>
                  </div>
                </FieldGroup>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

function FieldGroup({
  titulo,
  className = "",
  children,
}: {
  titulo: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-md border border-border bg-surface-2/40 p-3 space-y-3 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{titulo}</p>
      {children}
    </div>
  );
}

function SmallButton({ children, destacado = false }: { children: React.ReactNode; destacado?: boolean }) {
  return (
    <button
      type="submit"
      className={
        destacado
          ? "rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover transition-colors shrink-0"
          : "rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-3 transition-colors shrink-0"
      }
    >
      {children}
    </button>
  );
}
