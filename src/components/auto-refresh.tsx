"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refresca la ruta actual cada `intervaloMs` mientras el componente esté montado (simula "tiempo real" sin websockets). */
export function AutoRefresh({ intervaloMs = 4000 }: { intervaloMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervaloMs);
    return () => clearInterval(id);
  }, [router, intervaloMs]);

  return null;
}
