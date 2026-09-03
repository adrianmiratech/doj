import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export function Totp2FABanner() {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
      <div className="flex items-center gap-2.5 text-warning">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        Tu rango exige verificación en dos pasos y todavía no la activaste.
      </div>
      <Link
        href="/dashboard/perfil"
        className="shrink-0 rounded-md bg-warning px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90 transition-opacity"
      >
        Configurar ahora
      </Link>
    </div>
  );
}
