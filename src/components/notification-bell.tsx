"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  listarMisNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas,
} from "@/lib/actions/notificaciones";

type Notificacion = {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string | null;
  enlace: string | null;
  leida: boolean;
  createdAt: Date;
};

function tiempoRelativo(fecha: Date) {
  const segundos = Math.max(0, (Date.now() - new Date(fecha).getTime()) / 1000);
  if (segundos < 60) return "ahora mismo";
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas}h`;
  const dias = Math.floor(horas / 24);
  return `hace ${dias}d`;
}

export function NotificationBell({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [abierto, setAbierto] = useState(false);
  const [items, setItems] = useState<Notificacion[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/notificaciones/count");
        if (res.ok) {
          const data = await res.json();
          setCount(data.count);
        }
      } catch {
        // silencioso: si falla el polling, no rompemos la interfaz
      }
    }, 25000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function alAbrir() {
    const nuevoEstado = !abierto;
    setAbierto(nuevoEstado);
    if (nuevoEstado) {
      setCargando(true);
      const data = await listarMisNotificaciones();
      setItems(data);
      setCargando(false);
    }
  }

  async function alPulsarItem(n: Notificacion) {
    if (!n.leida) {
      setItems((prev) => prev?.map((i) => (i.id === n.id ? { ...i, leida: true } : i)) ?? null);
      setCount((c) => Math.max(0, c - 1));
      await marcarNotificacionLeida(n.id);
    }
    setAbierto(false);
  }

  async function alMarcarTodas() {
    setItems((prev) => prev?.map((i) => ({ ...i, leida: true })) ?? null);
    setCount(0);
    await marcarTodasLeidas();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={alAbrir}
        title="Notificaciones"
        className="relative h-9 w-9 rounded-md border border-border hover:bg-surface-2 flex items-center justify-center text-text-muted hover:text-text transition-colors"
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-semibold flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg z-20">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <p className="text-sm font-semibold">Notificaciones</p>
            {items && items.some((i) => !i.leida) && (
              <button
                type="button"
                onClick={alMarcarTodas}
                className="text-xs text-accent hover:underline"
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          {cargando && <p className="px-4 py-6 text-center text-sm text-text-muted">Cargando…</p>}

          {!cargando && items && items.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-text-muted">No tienes notificaciones.</p>
          )}

          {!cargando &&
            items?.map((n) => {
              const contenido = (
                <div
                  className={`px-4 py-3 border-b border-border/60 last:border-0 hover:bg-surface-2 transition-colors cursor-pointer ${
                    n.leida ? "" : "bg-accent/5"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.leida && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{n.titulo}</p>
                      {n.mensaje && <p className="text-xs text-text-muted mt-0.5">{n.mensaje}</p>}
                      <p className="text-[11px] text-text-muted mt-1">{tiempoRelativo(n.createdAt)}</p>
                    </div>
                  </div>
                </div>
              );
              return n.enlace ? (
                <Link key={n.id} href={n.enlace} onClick={() => alPulsarItem(n)}>
                  {contenido}
                </Link>
              ) : (
                <div key={n.id} onClick={() => alPulsarItem(n)}>
                  {contenido}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
