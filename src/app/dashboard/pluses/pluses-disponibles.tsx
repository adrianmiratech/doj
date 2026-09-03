"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { registrarPlusMultiple } from "@/lib/actions/pluses";

type Agente = { id: string; nombre: string; apellidos: string };
type Tipo = { id: string; nombre: string; descripcion: string | null; monto: number };

export function PlusesDisponibles({
  tipos,
  agentes,
  semanas,
  miId,
}: {
  tipos: Tipo[];
  agentes: Agente[];
  semanas: { value: string; label: string }[];
  miId: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const [tipoId, setTipoId] = useState(tipos[0]?.id ?? "");
  const [busqueda, setBusqueda] = useState("");

  function abrir(tipo: string) {
    setTipoId(tipo);
    setBusqueda("");
    dialogRef.current?.showModal();
  }

  function marcarTodos(valor: boolean) {
    listaRef.current
      ?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
      .forEach((cb) => {
        if (cb.closest("[data-hidden='true']")) return;
        cb.checked = valor;
      });
  }

  const agentesFiltrados = agentes.filter((a) =>
    `${a.nombre} ${a.apellidos}`.toLowerCase().includes(busqueda.toLowerCase()),
  );

  if (tipos.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface px-5 py-8 text-center text-sm text-text-muted">
        No hay tipos de plus configurados todavía.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {tipos.map((t) => (
          <div key={t.id} className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{t.nombre}</p>
              <span className="text-accent text-sm font-semibold">${t.monto.toLocaleString("es-ES")}</span>
            </div>
            {t.descripcion && <p className="text-xs text-text-muted mt-1">{t.descripcion}</p>}
            <button onClick={() => abrir(t.id)} className="mt-3 text-xs text-accent hover:underline">
              + Registrar
            </button>
          </div>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        className="rounded-lg border border-border bg-surface p-0 w-full max-w-md text-text backdrop:bg-black/60"
      >
        <form action={registrarPlusMultiple} onSubmit={() => dialogRef.current?.close()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold">+ Registrar Plus</h2>
            <button type="button" onClick={() => dialogRef.current?.close()} className="text-text-muted hover:text-text">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Agentes ({agentes.length})</label>
                <div className="flex gap-2 text-xs">
                  <button type="button" onClick={() => marcarTodos(true)} className="text-accent hover:underline">
                    Todos
                  </button>
                  <button type="button" onClick={() => marcarTodos(false)} className="text-accent hover:underline">
                    Ninguno
                  </button>
                </div>
              </div>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar agente…"
                className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent mb-2"
              />
              <div ref={listaRef} className="max-h-40 overflow-y-auto rounded-md border border-border divide-y divide-border">
                {agentes.map((a) => {
                  const oculto = !agentesFiltrados.includes(a);
                  return (
                    <label
                      key={a.id}
                      data-hidden={oculto}
                      className={`flex items-center gap-2 px-3 py-2 text-sm ${oculto ? "hidden" : ""}`}
                    >
                      <input
                        type="checkbox"
                        name="agentes"
                        value={a.id}
                        defaultChecked={a.id === miId}
                        className="accent-[color:var(--accent)]"
                      />
                      {a.nombre} {a.apellidos}
                    </label>
                  );
                })}
                {agentesFiltrados.length === 0 && (
                  <p className="px-3 py-2 text-xs text-text-muted">Sin resultados.</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Tipo de Plus</label>
              <select
                name="tipoId"
                value={tipoId}
                onChange={(e) => setTipoId(e.target.value)}
                required
                className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
              >
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Semana</label>
              <select
                name="semana"
                required
                defaultValue={semanas[0]?.value}
                className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
              >
                {semanas.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Notas (opcional)</label>
              <textarea
                name="notas"
                rows={3}
                placeholder="Añade cualquier detalle relevante…"
                className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface-2 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
            >
              + Registrar
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
