const API = "https://api.northflank.com/v1";

function config() {
  const token = process.env.NORTHFLANK_API_TOKEN;
  const projectId = process.env.NORTHFLANK_PROJECT_ID;
  const serviceId = process.env.NORTHFLANK_SERVICE_ID;
  if (!token || !projectId || !serviceId) return null;
  return { token, projectId, serviceId };
}

function headers(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export type EstadoBot = {
  disponible: boolean;
  corriendo: boolean;
  containerId?: string;
  desde?: string;
  deployedSha?: string;
};

/** Consulta el contenedor más reciente del bot en Northflank para saber si está corriendo. */
export async function obtenerEstadoBot(): Promise<EstadoBot> {
  const cfg = config();
  if (!cfg) return { disponible: false, corriendo: false };

  try {
    const [containersRes, serviceRes] = await Promise.all([
      fetch(`${API}/projects/${cfg.projectId}/services/${cfg.serviceId}/containers`, { headers: headers(cfg.token) }),
      fetch(`${API}/projects/${cfg.projectId}/services/${cfg.serviceId}`, { headers: headers(cfg.token) }),
    ]);
    if (!containersRes.ok || !serviceRes.ok) return { disponible: true, corriendo: false };

    const containers = (await containersRes.json()) as {
      data: { containers: { name: string; status: string; createdAt: number }[] };
    };
    const service = (await serviceRes.json()) as {
      data: { deployment?: { internal?: { deployedSHA?: string } } };
    };

    const masReciente = [...containers.data.containers].sort((a, b) => b.createdAt - a.createdAt)[0];

    return {
      disponible: true,
      corriendo: masReciente?.status === "TASK_RUNNING",
      containerId: masReciente?.name,
      desde: masReciente ? new Date(masReciente.createdAt * 1000).toISOString() : undefined,
      deployedSha: service.data.deployment?.internal?.deployedSHA?.slice(0, 7),
    };
  } catch (error) {
    console.error("[northflank] Error consultando estado:", error);
    return { disponible: true, corriendo: false };
  }
}

/** Reinicia el servicio del bot en Northflank. */
export async function reiniciarBot(): Promise<{ ok: boolean; error?: string }> {
  const cfg = config();
  if (!cfg) return { ok: false, error: "Falta configurar Northflank (variables de entorno)" };

  try {
    const res = await fetch(`${API}/projects/${cfg.projectId}/services/${cfg.serviceId}/restart`, {
      method: "POST",
      headers: headers(cfg.token),
    });
    if (!res.ok) return { ok: false, error: await res.text() };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

export type LineaLog = { ts: string; log: string; containerId: string };

/** Últimas líneas de logs de runtime del bot. Si se indica containerId, se limita al contenedor actual (evita mezclar reinicios anteriores). */
export async function obtenerLogsBot(limite = 60, containerId?: string): Promise<LineaLog[]> {
  const cfg = config();
  if (!cfg) return [];

  try {
    const params = new URLSearchParams({ lineLimit: String(limite), types: "runtime", direction: "backward" });
    if (containerId) params.set("containerId", containerId);
    const res = await fetch(`${API}/projects/${cfg.projectId}/services/${cfg.serviceId}/logs?${params}`, {
      headers: headers(cfg.token),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data: LineaLog[] };
    return json.data.reverse();
  } catch (error) {
    console.error("[northflank] Error obteniendo logs:", error);
    return [];
  }
}
