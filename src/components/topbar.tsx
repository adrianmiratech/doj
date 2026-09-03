import { LogOut, Scale } from "lucide-react";
import { logoutAction } from "@/lib/actions/logout";
import { ROLE_LABELS } from "@/lib/labels";
import { NotificationBell } from "@/components/notification-bell";

export function Topbar({
  nombre,
  apellidos,
  role,
  cargo,
  notificacionesNoLeidas = 0,
}: {
  nombre: string;
  apellidos: string;
  role: string;
  cargo: string | null;
  notificacionesNoLeidas?: number;
}) {
  const initials = `${nombre[0] ?? ""}${apellidos[0] ?? ""}`.toUpperCase();

  return (
    <header className="h-16 shrink-0 sticky top-0 z-10 border-b border-border bg-surface flex items-center justify-between px-6">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center">
          <Scale className="h-4 w-4 text-accent" />
        </div>
        <span className="font-semibold text-sm hidden sm:inline">
          Departamento de Justicia · Old State RP
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right leading-tight hidden sm:block">
          <p className="text-sm font-medium">
            {nombre} {apellidos}
          </p>
          <p className="text-xs text-text-muted">
            {ROLE_LABELS[role] ?? role}
            {cargo ? ` · ${cargo}` : ""}
          </p>
        </div>
        <div className="h-9 w-9 rounded-full bg-surface-3 border border-border flex items-center justify-center text-xs font-semibold">
          {initials}
        </div>
        <NotificationBell initialCount={notificacionesNoLeidas} />
        <form action={logoutAction}>
          <button
            type="submit"
            title="Cerrar sesión"
            className="h-9 w-9 rounded-md border border-border hover:bg-surface-2 flex items-center justify-center text-text-muted hover:text-text transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
