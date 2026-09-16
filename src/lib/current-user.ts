import { cache } from "react";
import { prisma } from "@/lib/prisma";

// El layout de cada area (dashboard/portal) y la propia pagina que se esta
// abriendo piden por separado la fila completa del usuario en sesion. cache()
// de React dedupe automaticamente llamadas con el mismo id dentro de un mismo
// request/render, así que layout + pagina comparten una sola consulta a la
// base de datos en vez de dos (el ahorro es mayor todavia en produccion, con
// la base de datos remota en Turso, donde cada consulta paga latencia de red).
export const obtenerUsuarioActual = cache((id: string) => {
  return prisma.user.findUnique({ where: { id } });
});
