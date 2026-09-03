import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TODOS_LOS_RANGOS } from "@/lib/labels";
import { asegurarGrupoGeneral, listarConversacionesDe, abrirConversacionPrivada } from "@/lib/actions/mensajeria";
import { Users } from "lucide-react";

export default async function MensajeriaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session!.user;

  await asegurarGrupoGeneral(user.id);
  const [conversaciones, companeros] = await Promise.all([
    listarConversacionesDe(user.id),
    prisma.user.findMany({
      where: {
        id: { not: user.id },
        activo: true,
        OR: [{ role: { in: TODOS_LOS_RANGOS as unknown as string[] as never } }, { esStaffServidor: true }],
      },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, apellidos: true },
    }),
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-8rem)]">
      <aside className="rounded-lg border border-border bg-surface flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border">
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-accent">+ Nuevo mensaje privado</summary>
            <form action={abrirConversacionPrivada} className="mt-2 flex gap-2">
              <select
                name="otroId"
                required
                defaultValue=""
                className="flex-1 rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs outline-none focus:border-accent"
              >
                <option value="" disabled>
                  Elige un compañero…
                </option>
                {companeros.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.apellidos}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
              >
                Ir
              </button>
            </form>
          </details>
        </div>
        <nav className="flex-1 overflow-y-auto">
          {conversaciones.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/mensajeria/${c.id}`}
              className="flex items-center gap-2.5 px-4 py-3 border-b border-border/60 hover:bg-surface-2 transition-colors"
            >
              {c.tipo === "GRUPO" && <Users className="h-4 w-4 text-accent shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{c.titulo}</p>
                  {c.noLeidos > 0 && (
                    <span className="shrink-0 rounded-full bg-accent text-accent-foreground text-[10px] font-semibold px-1.5 py-0.5 min-w-[1.25rem] text-center">
                      {c.noLeidos}
                    </span>
                  )}
                </div>
                {c.ultimoMensaje && <p className="text-xs text-text-muted truncate">{c.ultimoMensaje}</p>}
              </div>
            </Link>
          ))}
        </nav>
      </aside>
      <div className="rounded-lg border border-border bg-surface flex flex-col overflow-hidden">{children}</div>
    </div>
  );
}
