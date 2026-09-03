"use client";

import { useEffect } from "react";
import { logoutAction } from "@/lib/actions/logout";

export function SessionExpiredCard() {
  useEffect(() => {
    logoutAction();
  }, []);

  return (
    <div className="max-w-sm mx-auto mt-16 rounded-lg border border-border bg-surface p-6 text-center space-y-3">
      <p className="text-sm font-semibold">Tu sesión ya no es válida</p>
      <p className="text-xs text-text-muted">Redirigiendo al inicio de sesión…</p>
    </div>
  );
}
