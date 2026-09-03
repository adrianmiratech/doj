import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/topbar";
import { SidebarNav, type NavSection } from "@/components/sidebar-nav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session!.user;
  const notificacionesNoLeidas = await prisma.notificacion.count({ where: { userId: user.id, leida: false } });

  const sections: NavSection[] = [
    {
      title: "General",
      items: [{ href: "/portal", label: "Inicio", icon: "inicio" }],
    },
    {
      title: "Mis gestiones",
      items: [
        { href: "/portal/tramites", label: "Trámites", icon: "tramites" },
        { href: "/portal/solicitudes", label: "Solicitudes", icon: "solicitudes" },
        { href: "/portal/juicios", label: "Mis Juicios", icon: "casos" },
      ],
    },
    {
      title: "Empleo",
      items: [{ href: "/portal/postulaciones", label: "Postulaciones", icon: "postulaciones" }],
    },
    {
      title: "Cuenta",
      items: [{ href: "/portal/perfil", label: "Mi perfil", icon: "perfil" }],
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Topbar
        nombre={user.nombre}
        apellidos={user.apellidos}
        role={user.role}
        cargo={user.cargo}
        notificacionesNoLeidas={notificacionesNoLeidas}
      />
      <div className="flex-1 flex">
        <aside className="w-60 shrink-0 border-r border-border bg-surface p-3 hidden md:block">
          <SidebarNav sections={sections} />
        </aside>
        <main className="flex-1 min-w-0 p-6 bg-bg">{children}</main>
      </div>
    </div>
  );
}
