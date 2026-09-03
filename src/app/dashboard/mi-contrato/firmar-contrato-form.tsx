"use client";

import { useActionState } from "react";
import { firmarContratoLaboral, type FirmarContratoState } from "@/lib/actions/contratos-laborales";

const initialState: FirmarContratoState = { error: null, success: false };

export function FirmarContratoForm({ contratoId }: { contratoId: string }) {
  const [state, formAction, pending] = useActionState(firmarContratoLaboral, initialState);

  if (state.success) {
    return (
      <p className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
        Contrato firmado. Ya está activo.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={contratoId} />
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Confirma tu contraseña para firmar (verificación de seguridad)
        </label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>
      {state.error && (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors disabled:opacity-60"
      >
        {pending ? "Firmando…" : "Firmar contrato"}
      </button>
    </form>
  );
}
