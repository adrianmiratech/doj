import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { ESTADO_SOLICITUD_COLORS, ESTADO_SOLICITUD_LABELS } from "@/lib/labels";
import { crearSolicitud } from "@/lib/actions/solicitudes";

const CATEGORIAS = ["Apelacion", "Queja", "Peticion", "Denuncia civil", "Otro"];

export default async function PortalSolicitudesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const solicitudes = await prisma.solicitud.findMany({
    where: { ciudadanoId: userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Mis solicitudes</h1>
        <p className="text-sm text-text-muted">Apelaciones, quejas, peticiones y denuncias civiles.</p>
      </div>

      <details className="rounded-lg border border-border bg-surface p-5" open={solicitudes.length === 0}>
        <summary className="cursor-pointer text-sm font-medium">+ Presentar nueva solicitud</summary>
        <form action={crearSolicitud} className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Asunto</label>
            <input
              name="asunto"
              required
              placeholder="Título breve de tu solicitud"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Categoría</label>
            <select
              name="categoria"
              required
              defaultValue=""
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="" disabled>
                Selecciona una categoría
              </option>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Descripción</label>
            <textarea
              name="descripcion"
              required
              rows={4}
              placeholder="Describe con detalle tu solicitud"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
          >
            Enviar solicitud
          </button>
        </form>
      </details>

      <div className="rounded-lg border border-border bg-surface divide-y divide-border">
        {solicitudes.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-text-muted">Aún no has presentado ninguna solicitud.</p>
        )}
        {solicitudes.map((s) => (
          <div key={s.id} className="px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{s.asunto}</p>
                <p className="text-xs text-text-muted">
                  {s.categoria} · {new Date(s.createdAt).toLocaleDateString("es-ES")}
                </p>
              </div>
              <StatusBadge
                label={ESTADO_SOLICITUD_LABELS[s.estado]}
                className={ESTADO_SOLICITUD_COLORS[s.estado]}
              />
            </div>
            {s.respuesta && (
              <p className="mt-2 text-sm rounded-md bg-surface-2 border border-border px-3 py-2 whitespace-pre-wrap">
                <span className="text-text-muted">Respuesta: </span>
                {s.respuesta}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
