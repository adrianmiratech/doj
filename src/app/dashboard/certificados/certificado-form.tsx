"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CertificadoForm({
  rango,
  apellidos,
  legajo,
}: {
  rango: string;
  apellidos: string;
  legajo: string | null;
}) {
  const [nombre, setNombre] = useState("");
  const [tieneAntecedentes, setTieneAntecedentes] = useState(false);
  const [detalle, setDetalle] = useState("");
  const [copiado, setCopiado] = useState(false);

  const fecha = new Date().toLocaleDateString("es-ES");
  const firma = `Fdo: ${rango} ${apellidos}${legajo ? ` Nº Placa: ${legajo}` : ""}`;

  const texto = nombre.trim()
    ? tieneAntecedentes
      ? `/do En el certificado se vería que ${nombre} consta con antecedentes en la base de datos a día (${fecha})${
          detalle.trim() ? `: ${detalle}` : "."
        }\n${firma}`
      : `/do En el certificado se vería que ${nombre} no consta que a día (${fecha}) tenga ningún tipo de antecedente en la base de datos.\n${firma}`
    : "";

  async function copiar() {
    if (!texto) return;
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
        <h2 className="text-sm font-semibold">Datos del Certificado</h2>

        <div>
          <label className="block text-sm font-medium mb-1.5">Nombre del ciudadano</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre y apellidos del ciudadano"
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={tieneAntecedentes}
            onChange={(e) => setTieneAntecedentes(e.target.checked)}
            className="accent-[color:var(--accent)]"
          />
          El ciudadano tiene antecedentes
        </label>

        {tieneAntecedentes && (
          <div>
            <label className="block text-sm font-medium mb-1.5">Detalle de los antecedentes</label>
            <textarea
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              rows={3}
              placeholder="Ej. Art. 63 Conducción temeraria (22/08/2026)"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
        )}

        <div>
          <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Firmante</p>
          <p className="text-sm">
            <span className="font-medium">{rango}</span>{" "}
            <span className="text-text-muted">{apellidos}{legajo ? ` · Nº Placa: ${legajo}` : ""}</span>
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5 flex flex-col">
        <h2 className="text-sm font-semibold mb-4">Vista previa del certificado</h2>
        {texto ? (
          <>
            <pre className="flex-1 whitespace-pre-wrap break-words rounded-md border border-border bg-surface-2 p-3 text-sm font-mono">
              {texto}
            </pre>
            <div className="mt-4 flex gap-2">
              <button
                onClick={copiar}
                className="flex-1 flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
              >
                {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiado ? "Copiado" : "Copiar certificado"}
              </button>
              <button
                onClick={() => {
                  setNombre("");
                  setDetalle("");
                  setTieneAntecedentes(false);
                }}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface-2 transition-colors"
              >
                Limpiar
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-sm text-text-muted">
            Introduce el nombre del ciudadano para generar el certificado
          </div>
        )}
      </div>
    </div>
  );
}
