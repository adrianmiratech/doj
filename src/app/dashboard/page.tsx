import Link from "next/link";
import { FileText, ClipboardList, Gavel, CalendarClock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { StatusBadge } from "@/components/status-badge";
import { PlacaWidget } from "@/components/placa-widget";
import { SessionExpiredCard } from "@/components/session-expired-card";
import { ESTADO_SOLICITUD_COLORS, ESTADO_SOLICITUD_LABELS } from "@/lib/labels";
import { horasSemanaMs, inicioSemana } from "@/lib/fichaje";

export default async function DashboardHome() {
  const session = await auth();
  const user = session!.user;

  const [
    me,
    fichajesSemana,
    contratosPendientes,
    faltasActivas,
    tramitesPendientes,
    solicitudesPendientes,
    casosAbiertos,
    proximasAudiencias,
    ultimosTramites,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id } }),
    prisma.fichaje.findMany({ where: { userId: user.id, entrada: { gte: inicioSemana() } } }),
    prisma.contrato.count({ where: { redactorId: user.id, estado: "PENDIENTE_FIRMA" } }),
    prisma.falta.count({ where: { empleadoId: user.id, estado: "PENDIENTE" } }),
    prisma.tramite.count({ where: { estado: { in: ["PENDIENTE", "EN_REVISION"] } } }),
    prisma.solicitud.count({ where: { estado: { in: ["PENDIENTE", "EN_REVISION"] } } }),
    prisma.caso.count({ where: { estado: { in: ["ABIERTO", "EN_PROCESO", "EN_JUICIO"] } } }),
    prisma.audiencia.count({ where: { fecha: { gte: new Date() } } }),
    prisma.tramite.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { tipo: true, ciudadano: true },
    }),
  ]);

  if (!me) return <SessionExpiredCard />;

  const stats = [
    { label: "Trámites pendientes", value: tramitesPendientes, icon: FileText, href: "/dashboard/tramites" },
    { label: "Solicitudes pendientes", value: solicitudesPendientes, icon: ClipboardList, href: "/dashboard/solicitudes" },
    { label: "Expedientes activos", value: casosAbiertos, icon: Gavel, href: "/dashboard/casos" },
    { label: "Audiencias próximas", value: proximasAudiencias, icon: CalendarClock, href: "/dashboard/audiencias" },
  ];

  return (
    <div className="space-y-6">
      <PlacaWidget
        nombre={me.nombre}
        apellidos={me.apellidos}
        role={me.role}
        legajo={me.legajo}
        activo={me.activo}
        desde={me.createdAt}
        horasSemanaMs={horasSemanaMs(fichajesSemana)}
        contratosPendientes={contratosPendientes}
        faltasActivas={faltasActivas}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-lg border border-border bg-surface p-4 hover:border-accent/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <s.icon className="h-5 w-5 text-accent" />
              <span className="text-2xl font-semibold">{s.value}</span>
            </div>
            <p className="mt-2 text-sm text-text-muted">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold">Últimos trámites recibidos</h2>
          <Link href="/dashboard/tramites" className="text-xs text-accent hover:underline">
            Ver todos
          </Link>
        </div>
        {ultimosTramites.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-text-muted">
            No hay trámites registrados todavía.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {ultimosTramites.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{t.tipo.nombre}</p>
                  <p className="text-xs text-text-muted truncate">
                    {t.ciudadano.nombre} {t.ciudadano.apellidos}
                  </p>
                </div>
                <StatusBadge
                  label={ESTADO_SOLICITUD_LABELS[t.estado]}
                  className={ESTADO_SOLICITUD_COLORS[t.estado]}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
