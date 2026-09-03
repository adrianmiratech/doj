import Link from "next/link";
import { prisma } from "@/lib/prisma";

type AudienciaConRelaciones = Awaited<
  ReturnType<typeof prisma.audiencia.findMany<{ include: { caso: true; juez: true } }>>
>;

export default async function AudienciasPage() {
  const audiencias = await prisma.audiencia.findMany({
    orderBy: { fecha: "asc" },
    include: { caso: true, juez: true },
  });

  const ahora = new Date();
  const proximas = audiencias.filter((a) => a.fecha >= ahora);
  const pasadas = audiencias.filter((a) => a.fecha < ahora).reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Audiencias</h1>
        <p className="text-sm text-text-muted">Agenda de audiencias de todos los expedientes.</p>
      </div>

      <Section title="Próximas" items={proximas} emptyLabel="No hay audiencias programadas." />
      <Section title="Pasadas" items={pasadas} emptyLabel="No hay audiencias pasadas." />
    </div>
  );
}

function Section({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: AudienciaConRelaciones;
  emptyLabel: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-5 py-3.5">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <ul className="divide-y divide-border">
        {items.length === 0 && (
          <li className="px-5 py-6 text-sm text-text-muted text-center">{emptyLabel}</li>
        )}
        {items.map((a) => (
          <li key={a.id} className="px-5 py-3">
            <Link href={`/dashboard/casos/${a.casoId}`} className="text-sm font-medium hover:text-accent">
              {a.caso.titulo}
            </Link>
            <p className="text-xs text-text-muted">
              {new Date(a.fecha).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })} ·{" "}
              {a.lugar} · Juez {a.juez.nombre} {a.juez.apellidos}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
