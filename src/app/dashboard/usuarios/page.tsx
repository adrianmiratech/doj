import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { alternarActivoUsuario, eliminarUsuario, resetearPasswordUsuario } from "@/lib/actions/usuarios";
import { formatUltimoAcceso } from "@/lib/fecha";

export default async function UsuariosPage() {
  const session = await auth();
  if (session?.user.role !== "JUEZ_SUPREMO") {
    redirect("/dashboard");
  }

  const usuarios = await prisma.user.findMany({
    where: { role: "CIVIL" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Usuarios (ciudadanos)</h1>
        <p className="text-sm text-text-muted">
          Cuentas civiles registradas desde /registro. Distinto de Empleados: aquí no hay rango ni nómina, solo
          acceso ciudadano al portal.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface divide-y divide-border">
        {usuarios.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-text-muted">No hay ciudadanos registrados todavía.</p>
        )}
        {usuarios.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {u.nombre} {u.apellidos}
              </p>
              <p className="text-xs text-text-muted">
                {u.email} · DNI {u.dni} · Registrado el {new Date(u.createdAt).toLocaleDateString("es-ES")}
              </p>
              <p className="text-xs text-text-muted">Último acceso: {formatUltimoAcceso(u.ultimoAcceso)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  u.activo ? "bg-success/15 text-success border-success/30" : "bg-surface-3 text-text-muted border-border"
                }`}
              >
                {u.activo ? "Activo" : "Inhabilitado"}
              </span>
              <form action={alternarActivoUsuario}>
                <input type="hidden" name="id" value={u.id} />
                <button
                  type="submit"
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2 transition-colors"
                >
                  {u.activo ? "Inhabilitar" : "Reactivar"}
                </button>
              </form>
              <form action={resetearPasswordUsuario}>
                <input type="hidden" name="id" value={u.id} />
                <button
                  type="submit"
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2 transition-colors"
                >
                  Resetear contraseña
                </button>
              </form>
              <form action={eliminarUsuario}>
                <input type="hidden" name="id" value={u.id} />
                <button
                  type="submit"
                  className="rounded-md border border-danger/30 text-danger px-3 py-1.5 text-xs font-medium hover:bg-danger/10 transition-colors"
                >
                  Eliminar
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
