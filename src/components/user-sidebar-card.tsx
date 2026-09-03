import { alternarDisponibilidad } from "@/lib/actions/perfil";
import { Avatar } from "@/components/avatar";

export function UserSidebarCard({
  nombre,
  apellidos,
  rango,
  avatarUrl,
  disponible,
}: {
  nombre: string;
  apellidos: string;
  rango: string;
  avatarUrl?: string | null;
  disponible: boolean;
}) {
  return (
    <div className="border-t border-border pt-3">
      <form action={alternarDisponibilidad}>
        <button
          type="submit"
          title={disponible ? "Disponible · pulsa para marcarte ocupado" : "Ocupado · pulsa para marcarte disponible"}
          className="w-full flex items-center gap-2.5 rounded-md px-2 py-2 hover:bg-surface-2 transition-colors text-left"
        >
          <div className="relative h-9 w-9 rounded-full border border-border shrink-0 overflow-hidden">
            <Avatar url={avatarUrl} />
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface ${
                disponible ? "bg-success" : "bg-danger"
              }`}
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {nombre} {apellidos}
            </p>
            <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent truncate max-w-full">
              {rango}
            </span>
          </div>
        </button>
      </form>
    </div>
  );
}
