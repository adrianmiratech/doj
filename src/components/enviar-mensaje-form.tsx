"use client";

import { useRef, useState, useTransition } from "react";
import { enviarMensaje } from "@/lib/actions/mensajeria";

/**
 * Formulario de envío controlado en cliente: deshabilita el botón y limpia
 * el campo al instante (antes de que responda el servidor), para que un
 * envío lento contra la base remota no invite a hacer doble clic y termine
 * mandando el mismo mensaje repetido.
 */
export function EnviarMensajeForm({ conversacionId }: { conversacionId: string }) {
  const [pending, startTransition] = useTransition();
  const [valor, setValor] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function enviar() {
    const contenido = valor.trim();
    if (!contenido || pending) return;
    const formData = new FormData();
    formData.set("conversacionId", conversacionId);
    formData.set("contenido", contenido);
    setValor("");
    startTransition(async () => {
      await enviarMensaje(formData);
      inputRef.current?.focus();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        enviar();
      }}
      className="p-3 border-t border-border flex gap-2 shrink-0"
    >
      <input
        ref={inputRef}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        disabled={pending}
        autoComplete="off"
        placeholder="Escribe un mensaje…"
        className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={pending || !valor.trim()}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Enviar"}
      </button>
    </form>
  );
}
