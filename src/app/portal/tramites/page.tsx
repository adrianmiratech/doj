import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { ESTADO_SOLICITUD_COLORS, ESTADO_SOLICITUD_LABELS } from "@/lib/labels";
import { crearTramite } from "@/lib/actions/tramites";

export default async function PortalTramitesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [tramites, tipos] = await Promise.all([
    prisma.tramite.findMany({
      where: { ciudadanoId: userId },
      orderBy: { createdAt: "desc" },
      include: { tipo: true },
    }),
    prisma.tipoTramite.findMany({ where: { activo: true, alcance: "EXTERNO" }, orderBy: { nombre: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Mis trámites</h1>
        <p className="text-sm text-text-muted">Solicita y haz seguimiento de tus trámites administrativos.</p>
      </div>

      {tipos.length === 0 && (
        <p className="rounded-lg border border-border bg-surface px-5 py-8 text-center text-sm text-text-muted">
          No hay ningún trámite disponible todavía.
        </p>
      )}

      {tipos.length > 0 && (
      <details className="rounded-lg border border-border bg-surface p-5" open={tramites.length === 0}>
        <summary className="cursor-pointer text-sm font-medium">+ Solicitar nuevo trámite</summary>
        <form action={crearTramite} className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Tipo de trámite</label>
            <select
              name="tipoId"
              required
              defaultValue=""
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="" disabled>
                Selecciona un trámite
              </option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} {t.costo > 0 ? `· $${t.costo}` : "· Gratuito"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Detalle de tu solicitud</label>
            <textarea
              name="detalle"
              required
              rows={3}
              placeholder="Explica brevemente el motivo de tu trámite"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
          >
            Enviar trámite
          </button>
        </form>
      </details>
      )}

      <div className="rounded-lg border border-border bg-surface divide-y divide-border">
        {tramites.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-text-muted">Aún no has solicitado ningún trámite.</p>
        )}
        {tramites.map((t) => (
          <div key={t.id} className="px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{t.tipo.nombre}</p>
                <p className="text-xs text-text-muted">
                  Enviado el {new Date(t.createdAt).toLocaleDateString("es-ES")}
                </p>
              </div>
              <StatusBadge
                label={ESTADO_SOLICITUD_LABELS[t.estado]}
                className={ESTADO_SOLICITUD_COLORS[t.estado]}
              />
            </div>
            {t.respuesta && (
              <p className="mt-2 text-sm rounded-md bg-surface-2 border border-border px-3 py-2 whitespace-pre-wrap">
                <span className="text-text-muted">Respuesta: </span>
                {t.respuesta}
              </p>
            )}
            {t.certificadoPdf && (
              <a
                href={`/portal/tramites/${t.id}/certificado`}
                className="mt-2 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
              >
                📄 Descargar certificado (PDF)
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
