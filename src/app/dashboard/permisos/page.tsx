import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES, ROLE_LABELS } from "@/lib/labels";
import { PERMISOS, PERMISO_KEYS } from "@/lib/permisos";
import { alternarPermisoRol } from "@/lib/actions/permisos";

export default async function PermisosPage() {
  const session = await auth();
  if (session?.user.role !== "JUEZ_SUPREMO") {
    redirect("/dashboard");
  }

  const concedidos = await prisma.rolPermiso.findMany();
  const set = new Set(concedidos.map((p) => `${p.role}:${p.permiso}`));

  const rangosDelegables = STAFF_ROLES.filter((r) => r !== "JUEZ_SUPREMO");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Permisos por rango</h1>
        <p className="text-sm text-text-muted">
          El Juez Supremo siempre tiene acceso completo. Marca aquí qué puede gestionar cada rango además de sus
          funciones habituales; por defecto ningún rango tiene permisos delegados.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-muted uppercase tracking-wide">
              <th className="px-5 py-3 font-medium">Permiso</th>
              {rangosDelegables.map((r) => (
                <th key={r} className="px-3 py-3 font-medium text-center">
                  {ROLE_LABELS[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {PERMISO_KEYS.map((permiso) => (
              <tr key={permiso}>
                <td className="px-5 py-3">{PERMISOS[permiso]}</td>
                {rangosDelegables.map((r) => {
                  const concedido = set.has(`${r}:${permiso}`);
                  return (
                    <td key={r} className="px-3 py-3 text-center">
                      <form action={alternarPermisoRol}>
                        <input type="hidden" name="role" value={r} />
                        <input type="hidden" name="permiso" value={permiso} />
                        <button
                          type="submit"
                          title={concedido ? "Concedido · pulsa para revocar" : "No concedido · pulsa para conceder"}
                          className={`h-5 w-5 rounded border transition-colors ${
                            concedido
                              ? "bg-success border-success"
                              : "bg-surface-2 border-border hover:border-accent"
                          }`}
                        />
                      </form>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
