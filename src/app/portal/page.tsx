import Link from "next/link";
import { FileText, ClipboardList, Gavel, UserPlus } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { ESTADO_SOLICITUD_COLORS, ESTADO_SOLICITUD_LABELS } from "@/lib/labels";

export default async function PortalHome() {
  const session = await auth();
  const userId = session!.user.id;

  const [tramites, solicitudes] = await Promise.all([
    prisma.tramite.findMany({
      where: { ciudadanoId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { tipo: true },
    }),
    prisma.solicitud.findMany({
      where: { ciudadanoId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Hola, {session!.user.nombre}</h1>
        <p className="text-sm text-text-muted">
          Bienvenido al portal ciudadano del Departamento de Justicia de Old State RP.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/portal/tramites"
          className="rounded-lg border border-border bg-surface p-5 hover:border-accent/40 transition-colors"
        >
          <FileText className="h-5 w-5 text-accent mb-2" />
          <p className="text-sm font-semibold">Solicitar un trámite</p>
          <p className="text-sm text-text-muted mt-1">
            Antecedentes penales, permisos, cambio de nombre y más.
          </p>
        </Link>
        <Link
          href="/portal/solicitudes"
          className="rounded-lg border border-border bg-surface p-5 hover:border-accent/40 transition-colors"
        >
          <ClipboardList className="h-5 w-5 text-accent mb-2" />
          <p className="text-sm font-semibold">Presentar una solicitud</p>
          <p className="text-sm text-text-muted mt-1">
            Apelaciones, quejas, peticiones o denuncias civiles.
          </p>
        </Link>
        <Link
          href="/portal/juicios"
          className="rounded-lg border border-border bg-surface p-5 hover:border-accent/40 transition-colors"
        >
          <Gavel className="h-5 w-5 text-accent mb-2" />
          <p className="text-sm font-semibold">Mis juicios y casos</p>
          <p className="text-sm text-text-muted mt-1">Juicios pendientes y resoluciones en las que estés involucrado.</p>
        </Link>
        <Link
          href="/portal/postulaciones"
          className="rounded-lg border border-border bg-surface p-5 hover:border-accent/40 transition-colors"
        >
          <UserPlus className="h-5 w-5 text-accent mb-2" />
          <p className="text-sm font-semibold">Postular a un rango</p>
          <p className="text-sm text-text-muted mt-1">Únete al Departamento de Justicia como empleado.</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold">Mis trámites recientes</h2>
            <Link href="/portal/tramites" className="text-xs text-accent hover:underline">
              Ver todos
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {tramites.length === 0 && (
              <li className="px-5 py-6 text-sm text-text-muted text-center">Sin trámites todavía.</li>
            )}
            {tramites.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm truncate">{t.tipo.nombre}</span>
                <StatusBadge
                  label={ESTADO_SOLICITUD_LABELS[t.estado]}
                  className={ESTADO_SOLICITUD_COLORS[t.estado]}
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold">Mis solicitudes recientes</h2>
            <Link href="/portal/solicitudes" className="text-xs text-accent hover:underline">
              Ver todas
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {solicitudes.length === 0 && (
              <li className="px-5 py-6 text-sm text-text-muted text-center">Sin solicitudes todavía.</li>
            )}
            {solicitudes.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm truncate">{s.asunto}</span>
                <StatusBadge
                  label={ESTADO_SOLICITUD_LABELS[s.estado]}
                  className={ESTADO_SOLICITUD_COLORS[s.estado]}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
