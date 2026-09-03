import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { ESTADO_CONTRATO_COLORS, ESTADO_CONTRATO_LABELS } from "@/lib/labels";
import { actualizarEstadoContrato, crearContrato } from "@/lib/actions/contratos";

const TIPOS_CONTRATO = [
  "Compraventa de vehículo",
  "Compraventa de negocio",
  "Testamento",
  "Matrimonio",
  "Otro",
];

export default async function ContratosPage() {
  const session = await auth();

  const contratos = await prisma.contrato.findMany({
    orderBy: { createdAt: "desc" },
    include: { redactor: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Registro Civil y Notaría</h1>
        <p className="text-sm text-text-muted">
          Compraventas, testamentos y matrimonios redactados por el Departamento.
        </p>
      </div>

      <details className="rounded-lg border border-border bg-surface p-5">
        <summary className="cursor-pointer text-sm font-medium">+ Redactar nuevo contrato</summary>
        <form action={crearContrato} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            name="tipo"
            required
            defaultValue=""
            className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="" disabled>
              Tipo de contrato
            </option>
            {TIPOS_CONTRATO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <textarea
            name="partes"
            required
            rows={2}
            placeholder="Partes implicadas (ej. Juan Pérez y María Gómez)"
            className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <textarea
            name="detalle"
            rows={6}
            placeholder="Detalle / clausulado del contrato (opcional, puede ser largo)"
            className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent sm:col-span-2"
          />
          <button
            type="submit"
            className="sm:col-span-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors w-fit"
          >
            Registrar contrato
          </button>
        </form>
      </details>

      <div className="rounded-lg border border-border bg-surface divide-y divide-border">
        {contratos.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-text-muted">No hay contratos registrados.</p>
        )}
        {contratos.map((c) => (
          <div key={c.id} className="px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{c.tipo}</p>
                <p className="text-xs text-text-muted whitespace-pre-wrap">{c.partes}</p>
                <p className="text-xs text-text-muted">
                  Redactado por {c.redactor.nombre} {c.redactor.apellidos} ·{" "}
                  {new Date(c.createdAt).toLocaleDateString("es-ES")}
                </p>
              </div>
              <StatusBadge
                label={ESTADO_CONTRATO_LABELS[c.estado]}
                className={ESTADO_CONTRATO_COLORS[c.estado]}
              />
            </div>
            {c.detalle && <p className="mt-2 text-sm text-text-muted whitespace-pre-wrap">{c.detalle}</p>}
            {c.estado === "PENDIENTE_FIRMA" && c.redactorId === session?.user.id && (
              <form action={actualizarEstadoContrato} className="mt-3 flex gap-2">
                <input type="hidden" name="id" value={c.id} />
                <button
                  type="submit"
                  name="estado"
                  value="FIRMADO"
                  className="rounded-md bg-success px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                >
                  Marcar como firmado
                </button>
                <button
                  type="submit"
                  name="estado"
                  value="ANULADO"
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2 transition-colors"
                >
                  Anular
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
