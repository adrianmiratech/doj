import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { entrarServicio, salirServicio } from "@/lib/actions/fichaje";
import { formatDuracion, horasSemanaMs, inicioSemana } from "@/lib/fichaje";
import { LiveTimer } from "@/components/live-timer";

const ACTIVIDADES = ["Atención al público", "Trámites", "Audiencias", "Investigación", "Administrativo"];

export default async function FichajePage() {
  const session = await auth();
  const userId = session!.user.id;

  const [abierto, fichajesSemana] = await Promise.all([
    prisma.fichaje.findFirst({ where: { userId, salida: null } }),
    prisma.fichaje.findMany({
      where: { userId, entrada: { gte: inicioSemana() } },
      orderBy: { entrada: "desc" },
    }),
  ]);

  const ahora = Date.now();
  const baseMsSemana = horasSemanaMs(fichajesSemana.filter((f) => f.salida !== null));
  const entradaAbiertaIso = abierto ? abierto.entrada.toISOString() : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Fichaje</h1>
        <p className="text-sm text-text-muted">Control de entrada y salida de servicio.</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wide">Horas esta semana</p>
          <p className="text-2xl font-semibold">
            <LiveTimer startAtIso={entradaAbiertaIso} baseMs={baseMsSemana} />
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-muted uppercase tracking-wide">Estado</p>
          <p className={`text-sm font-medium ${abierto ? "text-success" : "text-text-muted"}`}>
            {abierto ? "En servicio" : "Fuera de servicio"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        {abierto ? (
          <form action={salirServicio} className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-md bg-surface-2 border border-border px-3 py-2.5">
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Tiempo de este turno</p>
                <p className="text-xl font-semibold text-success">
                  <LiveTimer startAtIso={entradaAbiertaIso} />
                </p>
              </div>
            </div>
            <p className="text-sm text-text-muted">
              Actividad actual: <span className="text-text font-medium">{abierto.actividad}</span> · desde{" "}
              {abierto.entrada.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <button
              type="submit"
              className="w-full rounded-md bg-danger px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              Salir de servicio
            </button>
          </form>
        ) : (
          <form action={entrarServicio} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Actividad</label>
              <select
                name="actividad"
                defaultValue={ACTIVIDADES[0]}
                className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
              >
                {ACTIVIDADES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-success px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              Entrar en servicio
            </button>
          </form>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold">Fichajes de esta semana</h2>
        </div>
        <ul className="divide-y divide-border">
          {fichajesSemana.length === 0 && (
            <li className="px-5 py-6 text-sm text-text-muted text-center">Sin fichajes esta semana.</li>
          )}
          {fichajesSemana.map((f) => (
            <li key={f.id} className="px-5 py-3 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{f.actividad}</p>
                <p className="text-xs text-text-muted">
                  {f.entrada.toLocaleDateString("es-ES")} ·{" "}
                  {f.entrada.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} –{" "}
                  {f.salida
                    ? f.salida.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                    : "en curso"}
                </p>
              </div>
              <span className="text-text-muted">
                {formatDuracion((f.salida ? f.salida.getTime() : ahora) - f.entrada.getTime())}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
