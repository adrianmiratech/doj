import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";

const MOTIVO_LABELS: Record<string, string> = {
  ok: "Acceso correcto",
  credenciales_invalidas: "Contraseña incorrecta",
  totp_invalido: "Código 2FA incorrecto",
  usuario_no_encontrado: "Correo no registrado",
  cuenta_suspendida: "Cuenta suspendida",
};

export default async function AccesosPage() {
  const session = await auth();
  if (session?.user.role !== "JUEZ_SUPREMO") {
    redirect("/dashboard");
  }

  const registros = await prisma.accesoLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Registros de acceso</h1>
        <p className="text-sm text-text-muted">
          Últimos {registros.length} intentos de login al portal (exitosos y fallidos), con IP de origen.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-muted uppercase tracking-wide">
              <th className="px-5 py-3 font-medium">Fecha</th>
              <th className="px-3 py-3 font-medium">Correo</th>
              <th className="px-3 py-3 font-medium">IP</th>
              <th className="px-3 py-3 font-medium">Resultado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {registros.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-text-muted">
                  Todavía no hay registros de acceso.
                </td>
              </tr>
            ) : (
              registros.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3 whitespace-nowrap text-text-muted">
                    {r.createdAt.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="px-3 py-3">{r.email}</td>
                  <td className="px-3 py-3 font-mono text-xs">{r.ip ?? "—"}</td>
                  <td className="px-3 py-3">
                    <StatusBadge
                      label={MOTIVO_LABELS[r.motivo ?? ""] ?? r.motivo ?? (r.exito ? "Correcto" : "Fallido")}
                      className={
                        r.exito
                          ? "bg-success/15 text-success border-success/30"
                          : "bg-danger/15 text-danger border-danger/30"
                      }
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
