"use client";

import { useActionState } from "react";
import {
  iniciarConfiguracion2FA,
  confirmar2FA,
  desactivar2FA,
  type Totp2FAState,
} from "@/lib/actions/totp";

const initialState: Totp2FAState = { error: null };

export function TotpSetupForm({
  habilitado,
  qrDataUrl,
  secretoManual,
}: {
  habilitado: boolean;
  qrDataUrl: string | null;
  secretoManual: string | null;
}) {
  const [confirmState, confirmAction, confirmPending] = useActionState(confirmar2FA, initialState);
  const [desactivarState, desactivarAction, desactivarPending] = useActionState(desactivar2FA, initialState);

  if (habilitado) {
    return (
      <div className="space-y-3">
        <p className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          Verificación en dos pasos activada. Te van a pedir el código cada vez que inicies sesión.
        </p>
        <form action={desactivarAction} className="flex gap-2">
          <input
            name="codigo"
            type="text"
            inputMode="numeric"
            maxLength={6}
            required
            placeholder="Código actual para desactivar"
            className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent font-mono tracking-widest"
          />
          <button
            type="submit"
            disabled={desactivarPending}
            className="rounded-md border border-danger/40 text-danger px-4 py-2 text-sm font-medium hover:bg-danger/10 transition-colors disabled:opacity-60"
          >
            Desactivar
          </button>
        </form>
        {desactivarState.error && <p className="text-xs text-danger">{desactivarState.error}</p>}
      </div>
    );
  }

  if (!qrDataUrl) {
    return (
      <form action={iniciarConfiguracion2FA}>
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
        >
          Activar verificación en dos pasos
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-muted">
        Escaneá este código con Google Authenticator, Authy o cualquier app de verificación en dos pasos, e
        introducí el código de 6 dígitos que te genere para confirmar.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- data: URI generada en el servidor, next/image no aplica */}
      <img src={qrDataUrl} alt="Código QR de verificación en dos pasos" width={176} height={176} className="border border-border bg-white p-2" />
      {secretoManual && (
        <p className="text-xs text-text-muted">
          ¿No podés escanear? Introducí este código manualmente:{" "}
          <code className="font-mono text-text">{secretoManual}</code>
        </p>
      )}
      <form action={confirmAction} className="flex gap-2">
        <input
          name="codigo"
          type="text"
          inputMode="numeric"
          maxLength={6}
          required
          autoFocus
          placeholder="123456"
          className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent font-mono tracking-widest"
        />
        <button
          type="submit"
          disabled={confirmPending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors disabled:opacity-60"
        >
          Confirmar
        </button>
      </form>
      {confirmState.error && <p className="text-xs text-danger">{confirmState.error}</p>}
    </div>
  );
}
