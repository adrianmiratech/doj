import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS, TODOS_LOS_RANGOS } from "@/lib/labels";
import { tienePermiso } from "@/lib/permisos";
import { totpObligatorioParaRol } from "@/lib/totp";
import { Topbar } from "@/components/topbar";
import { SidebarNav, type NavSection } from "@/components/sidebar-nav";
import { UserSidebarCard } from "@/components/user-sidebar-card";
import { TotpGate } from "@/components/totp-gate";
import { WelcomeTour } from "@/components/welcome-tour";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session!.user;
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { disponibilidad: true, avatarUrl: true, totpHabilitado: true, tourCompletado: true },
  });
  const notificacionesNoLeidas = await prisma.notificacion.count({ where: { userId: user.id, leida: false } });
  const debeConfigurar2FA = !me?.totpHabilitado && (await totpObligatorioParaRol(user.role));
  const esJuezSupremo = user.role === "JUEZ_SUPREMO";
  const esSapd = user.role === "ENCARGADO_SAPD" || user.role === "SAPD";
  // El acceso de Staff es independiente del rango de trabajo: quien no tiene un
  // rango real de Justicia/SAPD solo pudo llegar aquí (el middleware redirige a
  // /portal si no) gracias a `esStaffServidor`, así que ve el panel mínimo de Staff.
  const esStaff = !(TODOS_LOS_RANGOS as readonly string[]).includes(user.role);
  const puedeOrdenes =
    esJuezSupremo || esSapd || user.role === "FISCAL_GENERAL" || (await tienePermiso(user.role, "RESOLVER_ORDENES"));

  const sections: NavSection[] = esStaff
    ? [
        {
          title: "General",
          items: [{ href: "/dashboard", label: "Inicio", icon: "inicio" }],
        },
        {
          title: "Comunicación",
          items: [{ href: "/dashboard/feedback", label: "Quejas y Sugerencias", icon: "feedback" }],
        },
      ]
    : esSapd
    ? [
        {
          title: "General",
          items: [{ href: "/dashboard", label: "Inicio", icon: "inicio" }],
        },
        {
          title: "SAPD",
          items: [
            { href: "/dashboard/sapd", label: "Plantilla SAPD", icon: "sapd" },
            { href: "/dashboard/fichaje", label: "Fichaje", icon: "fichaje" },
            { href: "/dashboard/informes", label: "Informes", icon: "informes" },
            { href: "/dashboard/solicitudes", label: "Trámites y Solicitudes", icon: "solicitudes" },
            { href: "/dashboard/certificados", label: "Cert. Antecedentes", icon: "certificados" },
            { href: "/dashboard/ordenes", label: "Órdenes judiciales", icon: "ordenes" },
            { href: "/dashboard/resoluciones", label: "Resoluciones", icon: "resoluciones" },
          ],
        },
        {
          title: "Comunicación",
          items: [{ href: "/dashboard/feedback", label: "Quejas y Sugerencias", icon: "feedback" }],
        },
      ]
    : [
        {
          title: "General",
          items: [{ href: "/dashboard", label: "Inicio", icon: "inicio" }],
        },
        {
          title: "Mi turno",
          items: [{ href: "/dashboard/fichaje", label: "Fichaje", icon: "fichaje" }],
        },
        {
          title: "Trabajo",
          items: [
            { href: "/dashboard/informes", label: "Informes", icon: "informes" },
            { href: "/dashboard/solicitudes", label: "Trámites y Solicitudes", icon: "solicitudes" },
            { href: "/dashboard/certificados", label: "Cert. Antecedentes", icon: "certificados" },
          ],
        },
        {
          title: "Judicial",
          items: [
            ...(user.role === "JUEZ_SUPREMO" || user.role === "JUEZ_DISTRITO"
              ? [{ href: "/dashboard/mis-juicios", label: "Mis Juicios", icon: "misJuicios" as const }]
              : []),
            { href: "/dashboard/casos", label: "Expedientes", icon: "casos" },
            { href: "/dashboard/audiencias", label: "Audiencias", icon: "audiencias" },
            { href: "/dashboard/contratos", label: "Registro Civil", icon: "contratos" },
            ...(puedeOrdenes
              ? [
                  { href: "/dashboard/ordenes", label: "Órdenes judiciales", icon: "ordenes" as const },
                  { href: "/dashboard/resoluciones", label: "Resoluciones", icon: "resoluciones" as const },
                ]
              : []),
          ],
        },
        {
          title: "Mi perfil",
          items: [
            { href: "/dashboard/mi-contrato", label: "Contrato laboral", icon: "miContrato" as const },
            { href: "/dashboard/nominas", label: "Nóminas", icon: "nominas" as const },
            { href: "/dashboard/pluses", label: "Mis Pluses", icon: "pluses" as const },
            { href: "/dashboard/faltas", label: "Faltas", icon: "faltas" as const },
          ],
        },
        {
          title: "Comunicación",
          items: [{ href: "/dashboard/feedback", label: "Quejas y Sugerencias", icon: "feedback" }],
        },
        {
          title: "Recursos",
          items: [
            { href: "/dashboard/jerarquia", label: "Escala Jerárquica", icon: "jerarquia" as const },
            { href: "/dashboard/condecoraciones", label: "Condecoraciones", icon: "condecoraciones" as const },
            { href: "/dashboard/examenes", label: "Exámenes", icon: "examenes" as const },
            { href: "/dashboard/ranking", label: "Ranking", icon: "ranking" as const },
          ],
        },
      ];

  if (esJuezSupremo) {
    sections.push({
      title: "SAPD",
      items: [{ href: "/dashboard/sapd", label: "Plantilla SAPD", icon: "sapd" }],
    });
  }

  if (esJuezSupremo || (await tienePermiso(user.role, "GESTIONAR_EMPLEADOS"))) {
    sections.push({
      title: "Administración",
      items: [
        { href: "/dashboard/empleados", label: "Empleados", icon: "empleados" },
        ...(esJuezSupremo ? [{ href: "/dashboard/usuarios", label: "Usuarios", icon: "usuarios" as const }] : []),
        ...(esJuezSupremo ? [{ href: "/dashboard/staff", label: "Staff del servidor", icon: "staff" as const }] : []),
        { href: "/dashboard/postulaciones", label: "Postulaciones", icon: "postulaciones" },
        ...(esJuezSupremo ? [{ href: "/dashboard/permisos", label: "Permisos", icon: "permisos" as const }] : []),
        ...(esJuezSupremo ? [{ href: "/dashboard/accesos", label: "Registros de acceso", icon: "accesos" as const }] : []),
        ...(esJuezSupremo ? [{ href: "/dashboard/seguridad", label: "Seguridad del bot", icon: "seguridad" as const }] : []),
        ...(esJuezSupremo ? [{ href: "/dashboard/rendimiento", label: "Rendimiento", icon: "rendimiento" as const }] : []),
        ...(esJuezSupremo ? [{ href: "/dashboard/documentos", label: "Generar documento", icon: "documentos" as const }] : []),
      ],
    });
  }

  sections.push({
    title: "Cuenta",
    items: [{ href: "/dashboard/perfil", label: "Mi perfil", icon: "perfil" }],
  });

  const seccionesVisibles = sections.filter((s) => s.items.length > 0);

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
        <aside className="w-60 shrink-0 border-r border-border bg-surface hidden md:flex md:flex-col sticky top-14 h-[calc(100vh-3.5rem)] self-start">
          <div className="flex-1 overflow-y-auto p-3">
            <SidebarNav sections={seccionesVisibles} />
          </div>
          <div className="shrink-0 px-3 pb-3">
            <UserSidebarCard
              nombre={user.nombre}
              apellidos={user.apellidos}
              rango={ROLE_LABELS[user.role]}
              avatarUrl={me?.avatarUrl ?? null}
              disponible={(me?.disponibilidad ?? "DISPONIBLE") === "DISPONIBLE"}
            />
          </div>
        </aside>
        <main className="flex-1 min-w-0 p-6 bg-bg">
          <TotpGate activo={debeConfigurar2FA}>
            {!me?.tourCompletado && (
              <WelcomeTour
                nombre={user.nombre}
                rango={ROLE_LABELS[user.role] ?? user.role}
                legajo={user.legajo}
              />
            )}
            {children}
          </TotpGate>
        </main>
      </div>
    </div>
  );
}
