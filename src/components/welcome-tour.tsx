"use client";

import { useEffect, useRef, useState } from "react";
import { Scale, LayoutDashboard, Bell, Clock, ChevronRight } from "lucide-react";
import { completarTour } from "@/lib/actions/tour";

type Paso = { icon: typeof Scale; titulo: string; texto: string };

function pasos(nombre: string, rango: string, legajo: string | null): Paso[] {
  return [
    {
      icon: Scale,
      titulo: `Bienvenido/a, ${nombre}`,
      texto: `Quedaste dado/a de alta como ${rango}${legajo ? ` con la placa #${legajo}` : ""}. Esta es una guía rápida de cómo moverte por el portal — solo se muestra la primera vez.`,
    },
    {
      icon: LayoutDashboard,
      titulo: "Menú lateral",
      texto: "A la izquierda tenés todo organizado por secciones: tu turno, trabajo diario, judicial, tu perfil y más, según lo que te corresponda por tu rango.",
    },
    {
      icon: Clock,
      titulo: "Fichaje",
      texto: "No olvides fichar tu entrada y salida en \"Mi turno → Fichaje\" — de ahí salen tus horas semanales y tu nómina.",
    },
    {
      icon: Bell,
      titulo: "Notificaciones",
      texto: "La campana de arriba te avisa de trámites, faltas, contratos pendientes y más. Revisala seguido.",
    },
  ];
}

export function WelcomeTour({
  nombre,
  rango,
  legajo,
}: {
  nombre: string;
  rango: string;
  legajo: string | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [paso, setPaso] = useState(0);
  const items = pasos(nombre, rango, legajo);
  const esUltimo = paso === items.length - 1;
  const actual = items[paso];

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function cerrar() {
    dialogRef.current?.close();
    completarTour().catch(() => {});
  }

  return (
    <dialog ref={dialogRef} onClose={() => completarTour().catch(() => {})} className="w-full max-w-md rounded-lg border border-accent/40 bg-surface p-0 text-text">
      <div className="p-6">
        <div className="h-11 w-11 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center mb-4">
          <actual.icon className="h-5 w-5 text-accent" />
        </div>
        <h2 className="text-base font-semibold mb-2">{actual.titulo}</h2>
        <p className="text-sm text-text-muted leading-relaxed">{actual.texto}</p>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-1.5">
            {items.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-5 rounded-full ${i === paso ? "bg-accent" : "bg-surface-3"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {!esUltimo && (
              <button
                type="button"
                onClick={cerrar}
                className="text-xs text-text-muted hover:text-text transition-colors px-2"
              >
                Saltar
              </button>
            )}
            <button
              type="button"
              onClick={() => (esUltimo ? cerrar() : setPaso((p) => p + 1))}
              className="flex items-center gap-1 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors"
            >
              {esUltimo ? "Empezar" : "Siguiente"}
              {!esUltimo && <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
