"use client";

import { useEffect } from "react";
import { marcarPresencia } from "@/lib/actions/mensajeria";

/** Mientras esté montado (la conversación abierta en pantalla), avisa cada poco de que sigue "presente" — así no se manda un DM de Discord por mensajes que ya está viendo en directo. */
export function PresenceHeartbeat({ conversacionId }: { conversacionId: string }) {
  useEffect(() => {
    marcarPresencia(conversacionId);
    const id = setInterval(() => marcarPresencia(conversacionId), 15000);
    return () => clearInterval(id);
  }, [conversacionId]);

  return null;
}
