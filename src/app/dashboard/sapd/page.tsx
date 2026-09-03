import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS, ROLE_ORDER } from "@/lib/labels";
import { alternarActivoAgenteSapd, crearAgenteSapd, retirarAccesoSapd } from "@/lib/actions/sapd";
import { formatUltimoAcceso } from "@/lib/fecha";

export default async function SapdPage() {
  const session = await auth();
  const esJuezSupremo = session?.user.role === "JUEZ_SUPREMO";
  if (session?.user.role !== "ENCARGADO_SAPD" && !esJuezSupremo) {
    redirect("/dashboard");
  }

  const agentesRaw = await prisma.user.findMany({
    where: { role: { in: ["ENCARGADO_SAPD", "SAPD"] } },
    orderBy: { createdAt: "desc" },
  });
  const agentes = agentesRaw.sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Plantilla SAPD</h1>
        <p className="text-sm text-text-muted">
          Da de alta a tus agentes SAPD. Solo puedes crear cuentas con rango SAPD.
        </p>
      </div>

      <details className="rounded-lg border border-border bg-surface p-5">
        <summary className="cursor-pointer text-sm font-medium">+ Dar de alta un agente</summary>
        <form action={crearAgenteSapd} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <input
            name="discordId"
            placeholder="ID de Discord (opcional)"
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
            Crear cuenta SAPD
          </button>
        </form>
      </details>

      <div className="rounded-lg border border-border bg-surface divide-y divide-border">
        {agentes.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-text-muted">No hay nadie del SAPD dado de alta.</p>
        )}
        {agentes.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {a.nombre} {a.apellidos}{" "}
                <span className="text-xs text-text-muted font-normal">· {ROLE_LABELS[a.role]}</span>
              </p>
              <p className="text-xs text-text-muted">{a.email}</p>
              <p className="text-xs text-text-muted">Último acceso: {formatUltimoAcceso(a.ultimoAcceso)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  a.activo ? "bg-success/15 text-success border-success/30" : "bg-surface-3 text-text-muted border-border"
                }`}
              >
                {a.activo ? "Activo" : "Inactivo"}
              </span>
              {a.role === "SAPD" && (
                <form action={alternarActivoAgenteSapd}>
                  <input type="hidden" name="id" value={a.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2 transition-colors"
                  >
                    {a.activo ? "Desactivar" : "Reactivar"}
                  </button>
                </form>
              )}
              {esJuezSupremo && (
                <form action={retirarAccesoSapd}>
                  <input type="hidden" name="id" value={a.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-danger/30 text-danger px-3 py-1.5 text-xs font-medium hover:bg-danger/10 transition-colors"
                  >
                    Retirar acceso
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
