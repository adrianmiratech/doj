import { LogOut, Scale } from "lucide-react";
import { logoutAction } from "@/lib/actions/logout";
import { ROLE_LABELS } from "@/lib/labels";
import { NotificationBell } from "@/components/notification-bell";
import { Avatar } from "@/components/avatar";

export function Topbar({
  nombre,
  apellidos,
  avatarUrl,
  role,
  cargo,
  notificacionesNoLeidas = 0,
}: {
  nombre: string;
  apellidos: string;
  avatarUrl?: string | null;
  role: string;
  cargo: string | null;
  notificacionesNoLeidas?: number;
}) {
  return (
    <div className="sticky top-0 z-10 shrink-0">
      <header className="h-14 border-b-2 border-accent bg-navy-2 flex items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-white/10 border border-white/30 flex items-center justify-center">
            <Scale className="h-4 w-4 text-accent" />
          </div>
          <span className="font-bold text-sm text-white hidden sm:inline tracking-wide">
            DEPARTAMENTO DE JUSTICIA
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right leading-tight hidden sm:block">
            <p className="text-sm font-medium text-white">
              {nombre} {apellidos}
            </p>
            <p className="text-xs text-white/70">
              {ROLE_LABELS[role] ?? role}
              {cargo ? ` · ${cargo}` : ""}
            </p>
          </div>
          <div className="h-9 w-9 rounded-full border border-white/30 shrink-0 overflow-hidden">
            <Avatar url={avatarUrl} nombre={nombre} apellidos={apellidos} />
          </div>
          <NotificationBell initialCount={notificacionesNoLeidas} />
          <form action={logoutAction}>
            <button
              type="submit"
              title="Cerrar sesión"
              className="h-9 w-9 rounded-md border border-white/30 hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>
    </div>
  );
}
