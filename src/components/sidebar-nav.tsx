"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Gavel,
  CalendarClock,
  Clock,
  Users,
  UserCircle,
  ScrollText,
  Stamp,
  Wallet,
  Gift,
  AlertTriangle,
  Briefcase,
  Layers,
  Award,
  GraduationCap,
  Trophy,
  Settings,
  MessageSquare,
  FileStack,
  UserPlus,
  ShieldCheck,
  FileSignature,
  Landmark,
  Shield,
  UsersRound,
  Scale,
  History,
  ShieldAlert,
  Gauge,
} from "lucide-react";

const ICONS = {
  inicio: LayoutDashboard,
  tramites: FileText,
  solicitudes: ClipboardList,
  casos: Gavel,
  audiencias: CalendarClock,
  contratos: ScrollText,
  certificados: Stamp,
  fichaje: Clock,
  nominas: Wallet,
  pluses: Gift,
  faltas: AlertTriangle,
  miContrato: Briefcase,
  jerarquia: Layers,
  condecoraciones: Award,
  examenes: GraduationCap,
  ranking: Trophy,
  configuracion: Settings,
  feedback: MessageSquare,
  informes: FileStack,
  empleados: Users,
  perfil: UserCircle,
  postulaciones: UserPlus,
  permisos: ShieldCheck,
  ordenes: FileSignature,
  resoluciones: Landmark,
  sapd: Shield,
  usuarios: UsersRound,
  misJuicios: Scale,
  accesos: History,
  seguridad: ShieldAlert,
  rendimiento: Gauge,
} as const;

export type IconName = keyof typeof ICONS;

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export function SidebarNav({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            {section.title}
          </p>
          <div className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  item.href !== "/portal" &&
                  pathname.startsWith(item.href));
              const Icon = ICONS[item.icon];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-accent/15 text-accent border border-accent/30"
                      : "text-text-muted hover:text-text hover:bg-surface-2 border border-transparent"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
