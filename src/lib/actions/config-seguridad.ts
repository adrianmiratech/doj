"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireJuezSupremo } from "@/lib/permisos";
import { enviarLogDiscord } from "@/lib/discord-logs";

/** Lee la configuración del escáner de seguridad, creando la fila por defecto si todavía no existe. */
export async function obtenerConfigSeguridad() {
  return prisma.configSeguridad.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
}

export async function actualizarConfigSeguridadAction(formData: FormData) {
  const juezSupremo = await requireJuezSupremo();

  const num = (nombre: string, min: number, max: number) => {
    const v = Number(formData.get(nombre));
    if (!Number.isFinite(v) || v < min || v > max) throw new Error(`Valor inválido para ${nombre}`);
    return Math.round(v);
  };

  const escaneoActivo = formData.get("escaneoActivo") === "true";

  await prisma.configSeguridad.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      escaneoActivo,
      ventanaRaidMs: num("ventanaRaidMs", 1000, 300000),
      umbralRaid: num("umbralRaid", 2, 100),
      ventanaNukeMs: num("ventanaNukeMs", 1000, 300000),
      umbralNuke: num("umbralNuke", 1, 100),
      ventanaSancionesMs: num("ventanaSancionesMs", 1000, 300000),
      umbralSanciones: num("umbralSanciones", 1, 100),
      umbralBorradoMasivo: num("umbralBorradoMasivo", 2, 100),
    },
    update: {
      escaneoActivo,
      ventanaRaidMs: num("ventanaRaidMs", 1000, 300000),
      umbralRaid: num("umbralRaid", 2, 100),
      ventanaNukeMs: num("ventanaNukeMs", 1000, 300000),
      umbralNuke: num("umbralNuke", 1, 100),
      ventanaSancionesMs: num("ventanaSancionesMs", 1000, 300000),
      umbralSanciones: num("umbralSanciones", 1, 100),
      umbralBorradoMasivo: num("umbralBorradoMasivo", 2, 100),
    },
  });

  await enviarLogDiscord(
    prisma,
    "actividad",
    `⚙️ ${juezSupremo.nombre} ${juezSupremo.apellidos} actualizó la configuración del escáner de seguridad (${escaneoActivo ? "activo" : "desactivado"}).`,
  );

  revalidatePath("/dashboard/seguridad");
}
