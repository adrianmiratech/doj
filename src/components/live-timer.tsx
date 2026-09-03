"use client";

import { useEffect, useState } from "react";

function formatHMS(ms: number) {
  const totalSeg = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeg / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = totalSeg % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Cronómetro en vivo (con segundos). Si `startAtIso` está presente, cuenta hacia
 * arriba desde ese instante y suma `baseMs`; si no, muestra `baseMs` fijo.
 */
export function LiveTimer({ startAtIso, baseMs = 0, className }: { startAtIso: string | null; baseMs?: number; className?: string }) {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (!startAtIso) return;
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startAtIso]);

  const extra = startAtIso ? Math.max(0, ahora - new Date(startAtIso).getTime()) : 0;

  return <span className={`font-mono tabular-nums ${className ?? ""}`}>{formatHMS(baseMs + extra)}</span>;
}
