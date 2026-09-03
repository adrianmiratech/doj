"use client";

import { useState, useTransition } from "react";
import { loginAction, precheckLogin } from "./actions";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [paso, setPaso] = useState<"credenciales" | "codigo">("credenciales");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [totp, setTotp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviarLogin(totpCode?: string) {
    const formData = new FormData();
    formData.set("email", email);
    formData.set("password", password);
    formData.set("callbackUrl", callbackUrl);
    if (remember) formData.set("remember", "on");
    if (totpCode) formData.set("totp", totpCode);

    startTransition(async () => {
      const result = await loginAction({ error: null }, formData);
      if (result.error) setError(result.error);
    });
  }

  function onSubmitCredenciales(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await precheckLogin(email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.requiere2FA) {
        setPaso("codigo");
      } else {
        enviarLogin();
      }
    });
  }

  function onSubmitCodigo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    enviarLogin(totp);
  }

  if (paso === "codigo") {
    return (
      <form onSubmit={onSubmitCodigo} className="space-y-4">
        <div>
          <label htmlFor="totp" className="block text-sm font-medium mb-1.5">
            Código de verificación en dos pasos
          </label>
          <p className="text-xs text-text-muted mb-2">Introducí el código de 6 dígitos de tu app de autenticación.</p>
          <input
            id="totp"
            name="totp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            autoFocus
            value={totp}
            onChange={(e) => setTotp(e.target.value)}
            placeholder="123456"
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-mono tracking-widest"
          />
        </div>

        {error && (
          <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors disabled:opacity-60"
        >
          {pending ? "Verificando…" : "Verificar e iniciar sesión"}
        </button>
        <button
          type="button"
          onClick={() => {
            setPaso("credenciales");
            setTotp("");
            setError(null);
          }}
          className="w-full text-xs text-text-muted hover:text-text transition-colors"
        >
          ← Volver
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmitCredenciales} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1.5">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre.apellido@doj.es"
          className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1.5">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-text-muted">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="accent-[color:var(--accent)]"
        />
        Mantener sesión iniciada
      </label>

      {error && (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors disabled:opacity-60"
      >
        {pending ? "Accediendo…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
