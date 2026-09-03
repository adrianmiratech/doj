"use client";

import { AlertTriangle } from "lucide-react";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-lg mx-auto mt-12 rounded-lg border border-danger/30 bg-danger/5 p-6 text-center space-y-4">
      <AlertTriangle className="h-8 w-8 text-danger mx-auto" />
      <div>
        <p className="text-sm font-semibold text-danger">No se pudo completar la acción</p>
        <p className="text-sm text-text-muted mt-1">{error.message || "Ha ocurrido un error inesperado."}</p>
      </div>
      <button
        onClick={reset}
        className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface-2 transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}
