import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { obtenerEstadoBot, obtenerLogsBot } from "@/lib/northflank";
import { listarCanalesTexto, listarBaneados, obtenerEstadisticasServidor } from "@/lib/discord-control";
import { obtenerMensajesLog } from "@/lib/discord-logs";
import { obtenerConfigSeguridad } from "@/lib/actions/config-seguridad";
import { BotControlPanel } from "@/components/bot-control-panel";
import { SeguridadTabs } from "@/components/seguridad-tabs";

export default async function SeguridadPage() {
  const session = await auth();
  if (session?.user.role !== "JUEZ_SUPREMO") {
    redirect("/dashboard");
  }

  const [
    whitelist,
    estadoBot,
    canales,
    baneados,
    estadisticas,
    configSeguridad,
    mensajesProgramados,
  ] = await Promise.all([
    prisma.alertaWhitelist.findMany({ orderBy: { createdAt: "desc" } }),
    obtenerEstadoBot(),
    listarCanalesTexto(),
    listarBaneados(),
    obtenerEstadisticasServidor(),
    obtenerConfigSeguridad(),
    prisma.mensajeProgramado.findMany({ where: { enviado: false }, orderBy: { enviarEn: "asc" } }),
  ]);
  const [logsBot, historial] = await Promise.all([
    obtenerLogsBot(80, estadoBot.containerId),
    obtenerMensajesLog(prisma, "actividad", 40),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Seguridad del bot</h1>
        <p className="text-sm text-text-muted">
          Control completo del bot y del servidor de Discord desde un solo lugar: estado y logs, mensajería,
          moderación, automatizaciones y el historial de actividad.
        </p>
      </div>

      <BotControlPanel estado={estadoBot} logs={logsBot} />

      <SeguridadTabs
        canales={canales}
        baneados={baneados}
        estadisticas={estadisticas}
        configSeguridad={configSeguridad}
        mensajesProgramados={mensajesProgramados.map((m) => ({
          id: m.id,
          channelNombre: m.channelNombre,
          mensaje: m.mensaje,
          enviarEn: m.enviarEn.toISOString(),
        }))}
        whitelist={whitelist}
        historial={historial}
      />
    </div>
  );
}
