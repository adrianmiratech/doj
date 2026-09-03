import Link from "next/link";
import { Scale, FileText, Gavel, ShieldCheck, ClipboardList, Users } from "lucide-react";

const SERVICIOS = [
  {
    icon: FileText,
    title: "Trámites",
    desc: "Certificados de antecedentes, permisos, cambios de nombre y otros trámites administrativos.",
  },
  {
    icon: ClipboardList,
    title: "Solicitudes",
    desc: "Presenta apelaciones, quejas o peticiones y haz seguimiento de su estado en tiempo real.",
  },
  {
    icon: Gavel,
    title: "Expedientes judiciales",
    desc: "Gestión de casos, audiencias y resoluciones por parte de jueces, fiscales y abogados.",
  },
  {
    icon: Users,
    title: "Personal del Departamento",
    desc: "Acceso interno para funcionarios: fichaje, agenda de audiencias y gestión de casos.",
  },
];

export default function Home() {
  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center">
              <Scale className="h-5 w-5 text-accent" />
            </div>
            <div className="leading-tight">
              <p className="font-semibold text-sm">Departamento de Justicia</p>
              <p className="text-xs text-text-muted">Old State RP</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/registro"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface-2 transition-colors"
            >
              Crear cuenta
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent mb-6">
            <ShieldCheck className="h-3.5 w-3.5" />
            Portal oficial · Servidor de rol Old State RP
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-balance">
            Gestión integral del Departamento de Justicia
          </h1>
          <p className="mt-4 text-lg text-text-muted max-w-2xl mx-auto text-balance">
            Un único portal para empleados gubernamentales y ciudadanos: trámites,
            solicitudes, expedientes judiciales y audiencias, todo en un mismo lugar.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
            >
              Acceder al portal
            </Link>
            <a
              href="#servicios"
              className="rounded-md border border-border bg-surface px-5 py-2.5 text-sm font-medium hover:bg-surface-2 transition-colors"
            >
              Ver servicios
            </a>
          </div>
        </section>

        <section id="servicios" className="mx-auto max-w-6xl px-6 pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SERVICIOS.map((s) => (
              <div
                key={s.title}
                className="rounded-lg border border-border bg-surface p-5"
              >
                <s.icon className="h-6 w-6 text-accent mb-3" />
                <h3 className="font-semibold text-sm">{s.title}</h3>
                <p className="mt-1.5 text-sm text-text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-text-muted flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Departamento de Justicia · Old State RP. Contenido ficticio para servidor de rol.</p>
          <p>No afiliado a ninguna institución real.</p>
        </div>
      </footer>
    </div>
  );
}
