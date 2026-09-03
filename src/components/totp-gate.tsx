"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

/**
 * Si el rango del usuario exige 2FA y todavía no lo activó, bloquea el resto
 * del portal (solo deja pasar a /dashboard/perfil, donde puede configurarlo).
 */
export function TotpGate({ activo, children }: { activo: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const permitido = pathname === "/dashboard/perfil";

  if (activo && !permitido) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center space-y-4">
        <div className="h-14 w-14 rounded-full bg-warning/15 border border-warning/30 flex items-center justify-center mx-auto">
          <ShieldAlert className="h-6 w-6 text-warning" />
        </div>
        <h1 className="text-lg font-semibold">Verificación en dos pasos obligatoria</h1>
        <p className="text-sm text-text-muted">
          Tu rango exige tener la verificación en dos pasos activada. Configurala para poder seguir usando el
          portal.
        </p>
        <Link
          href="/dashboard/perfil"
          className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
        >
          Ir a configurarla
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
