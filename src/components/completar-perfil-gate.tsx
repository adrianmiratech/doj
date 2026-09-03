"use client";

import { useActionState } from "react";
import { UserRound } from "lucide-react";
import { completarPerfilInicial, type CompletarPerfilState } from "@/lib/actions/perfil";

const initialState: CompletarPerfilState = { error: null };

/**
 * Cuentas creadas con datos provisionales (verificación por Discord) no
 * pueden usar el resto del portal hasta rellenar este formulario: nombre
 * real y una contraseña nueva para reemplazar la temporal.
 */
export function CompletarPerfilGate({
  pendiente,
  children,
}: {
  pendiente: boolean;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(completarPerfilInicial, initialState);

  if (!pendiente) return <>{children}</>;

  return (
    <div className="max-w-md mx-auto mt-10 space-y-4">
      <div className="text-center space-y-2">
        <div className="h-14 w-14 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center mx-auto">
          <UserRound className="h-6 w-6 text-accent" />
        </div>
        <h1 className="text-lg font-semibold">Completa tu perfil</h1>
        <p className="text-sm text-text-muted">
          Tu cuenta se creó con datos provisionales al verificarte. Antes de seguir, dinos tu nombre de personaje
          y elige una contraseña nueva para reemplazar la temporal.
        </p>
      </div>

      <form action={formAction} className="rounded-lg border border-border bg-surface p-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Nombre</label>
            <input
              name="nombre"
              required
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Apellidos</label>
            <input
              name="apellidos"
              required
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Nueva contraseña</label>
          <input
            name="nueva"
            type="password"
            required
            minLength={6}
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Confirmar contraseña</label>
          <input
            name="confirmar"
            type="password"
            required
            minLength={6}
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
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar y continuar"}
        </button>
      </form>
    </div>
  );
}
