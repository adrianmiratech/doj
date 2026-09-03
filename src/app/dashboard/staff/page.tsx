import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { crearStaff, alternarActivoStaff, retirarAccesoStaff } from "@/lib/actions/staff";
import { formatUltimoAcceso } from "@/lib/fecha";

export default async function StaffPage() {
  const session = await auth();
  if (session?.user.role !== "JUEZ_SUPREMO") {
    redirect("/dashboard");
  }

  const staff = await prisma.user.findMany({
    where: { role: "STAFF" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Staff del servidor</h1>
        <p className="text-sm text-text-muted">
          Equipo de staff/moderación del servidor de Discord. No son personal del DOJ: sin nómina, contrato ni fichaje.
        </p>
      </div>

      <details className="rounded-lg border border-border bg-surface p-5">
        <summary className="cursor-pointer text-sm font-medium">+ Dar de alta un miembro del staff</summary>
        <form action={crearStaff} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            name="discordId"
            placeholder="ID de Discord (opcional)"
            className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent font-mono"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="Correo"
            className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Contraseña temporal (mín. 6 caracteres)"
            className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent sm:col-span-2"
          />
          <button
            type="submit"
            className="sm:col-span-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors w-fit"
          >
            Crear cuenta de Staff
          </button>
        </form>
      </details>

      <div className="rounded-lg border border-border bg-surface divide-y divide-border">
        {staff.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-text-muted">No hay nadie del staff dado de alta.</p>
        )}
        {staff.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {s.nombre} {s.apellidos}
              </p>
              <p className="text-xs text-text-muted">{s.email}</p>
              <p className="text-xs text-text-muted">Último acceso: {formatUltimoAcceso(s.ultimoAcceso)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  s.activo ? "bg-success/15 text-success border-success/30" : "bg-surface-3 text-text-muted border-border"
                }`}
              >
                {s.activo ? "Activo" : "Inactivo"}
              </span>
              <form action={alternarActivoStaff}>
                <input type="hidden" name="id" value={s.id} />
                <button
                  type="submit"
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2 transition-colors"
                >
                  {s.activo ? "Desactivar" : "Reactivar"}
                </button>
              </form>
              <form action={retirarAccesoStaff}>
                <input type="hidden" name="id" value={s.id} />
                <button
                  type="submit"
                  className="rounded-md border border-danger/30 text-danger px-3 py-1.5 text-xs font-medium hover:bg-danger/10 transition-colors"
                >
                  Retirar acceso
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
