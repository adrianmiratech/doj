import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { agregarAlertaWhitelist, quitarAlertaWhitelist } from "@/lib/actions/seguridad";

const TIPO_LABELS: Record<string, string> = {
  email: "Correo",
  ip: "IP",
  discord_id: "ID de Discord",
};

export default async function SeguridadPage() {
  const session = await auth();
  if (session?.user.role !== "JUEZ_SUPREMO") {
    redirect("/dashboard");
  }

  const whitelist = await prisma.alertaWhitelist.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Seguridad del bot</h1>
        <p className="text-sm text-text-muted">
          El bot te avisa por mensaje privado solo ante alertas altamente urgentes: fuerza bruta en el login,
          entradas masivas (raid), borrado masivo de canales/roles/mensajes (nuke), mención sospechosa a
          @everyone o creación de un rol con permiso de Administrador. Todo lo demás (accesos, cambios de rango,
          trámites, etc.) queda solo en los canales de logs de Discord, sin avisarte por DM.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold mb-1">Whitelist de pruebas</h2>
        <p className="text-xs text-text-muted mb-4">
          Correos, IPs o IDs de Discord exentos de disparar tu aviso urgente — usalo para tus propias pruebas o
          mantenimiento, para no recibir falsas alarmas.
        </p>

        <form action={agregarAlertaWhitelist} className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr_auto] gap-2 mb-4">
          <select
            name="tipo"
            className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
          >
            <option value="email">Correo</option>
            <option value="ip">IP</option>
            <option value="discord_id">ID de Discord</option>
          </select>
          <input
            name="valor"
            required
            placeholder="Valor a exentar"
            className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
          />
          <input
            name="nota"
            placeholder="Nota (opcional)"
            className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
          >
            Añadir
          </button>
        </form>

        {whitelist.length === 0 ? (
          <p className="text-xs text-text-muted">No hay nada en la whitelist todavía.</p>
        ) : (
          <ul className="space-y-1.5">
            {whitelist.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-xs"
              >
                <span>
                  <span className="text-text-muted">{TIPO_LABELS[w.tipo] ?? w.tipo}:</span>{" "}
                  <span className="font-mono">{w.valor}</span>
                  {w.nota && <span className="text-text-muted"> · {w.nota}</span>}
                </span>
                <form action={quitarAlertaWhitelist}>
                  <input type="hidden" name="id" value={w.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-danger/40 text-danger px-2.5 py-1 text-xs font-medium hover:bg-danger/10 transition-colors shrink-0"
                  >
                    Quitar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
