export const ROLE_LABELS: Record<string, string> = {
  JUEZ_SUPREMO: "Juez Supremo",
  JUEZ_DISTRITO: "Juez de Distrito",
  FISCAL_GENERAL: "Fiscal General",
  FISCAL: "Fiscal",
  DEFENSOR_PUBLICO: "Abogado",
  ALGUACIL: "Seguridad",
  ENCARGADO_SAPD: "Encargado SAPD",
  SAPD: "SAPD",
  STAFF: "Staff",
  CIVIL: "Ciudadano",
};

// "Rol Administrativo" interno de cada rango, tal como en la estructura funcional.
export const ROLE_TIER_LABELS: Record<string, string> = {
  JUEZ_SUPREMO: "Propietario",
  JUEZ_DISTRITO: "Gerente",
  FISCAL_GENERAL: "Empleado Senior",
  FISCAL: "Empleado Regular",
  DEFENSOR_PUBLICO: "Empleado Regular",
  ALGUACIL: "Empleado Especial",
  ENCARGADO_SAPD: "Jefatura SAPD",
  SAPD: "Agente SAPD",
  STAFF: "Staff del servidor",
  CIVIL: "Ciudadano",
};

// Orden jerárquico, del más alto al más bajo (para ordenar listados de personal).
export const ROLE_ORDER: string[] = [
  "JUEZ_SUPREMO",
  "JUEZ_DISTRITO",
  "FISCAL_GENERAL",
  "FISCAL",
  "DEFENSOR_PUBLICO",
  "ALGUACIL",
  "ENCARGADO_SAPD",
  "SAPD",
  "STAFF",
];

// Staff de Discord (moderación), no es personal del DOJ: sin nómina/contrato/fichaje.
export const STAFF_SERVIDOR_ROLES = ["STAFF"] as const;

export const ESTADO_SOLICITUD_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_REVISION: "En revisión",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  CERRADA: "Cerrada",
};

export const ESTADO_SOLICITUD_COLORS: Record<string, string> = {
  PENDIENTE: "bg-warning/15 text-warning border-warning/30",
  EN_REVISION: "bg-info/15 text-info border-info/30",
  APROBADA: "bg-success/15 text-success border-success/30",
  RECHAZADA: "bg-danger/15 text-danger border-danger/30",
  CERRADA: "bg-surface-3 text-text-muted border-border",
};

export const ESTADO_CASO_LABELS: Record<string, string> = {
  ABIERTO: "Abierto",
  EN_PROCESO: "En proceso",
  EN_JUICIO: "En juicio",
  CERRADO: "Cerrado",
  ARCHIVADO: "Archivado",
};

export const ESTADO_CASO_COLORS: Record<string, string> = {
  ABIERTO: "bg-info/15 text-info border-info/30",
  EN_PROCESO: "bg-warning/15 text-warning border-warning/30",
  EN_JUICIO: "bg-accent/15 text-accent border-accent/30",
  CERRADO: "bg-success/15 text-success border-success/30",
  ARCHIVADO: "bg-surface-3 text-text-muted border-border",
};

export const ESTADO_CONTRATO_LABELS: Record<string, string> = {
  PENDIENTE_FIRMA: "Pendiente de firma",
  FIRMADO: "Firmado",
  ANULADO: "Anulado",
};

export const ESTADO_CONTRATO_COLORS: Record<string, string> = {
  PENDIENTE_FIRMA: "bg-warning/15 text-warning border-warning/30",
  FIRMADO: "bg-success/15 text-success border-success/30",
  ANULADO: "bg-surface-3 text-text-muted border-border",
};

export const GRAVEDAD_LABELS: Record<string, string> = {
  LEVE: "Leve",
  GRAVE: "Grave",
  MUY_GRAVE: "Muy grave",
};

export const GRAVEDAD_COLORS: Record<string, string> = {
  LEVE: "bg-warning/15 text-warning border-warning/30",
  GRAVE: "bg-danger/15 text-danger border-danger/30",
  MUY_GRAVE: "bg-danger/25 text-danger border-danger/40",
};

export const ESTADO_FALTA_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  RECONOCIDA: "Reconocida",
};

export const ESTADO_FALTA_COLORS: Record<string, string> = {
  PENDIENTE: "bg-warning/15 text-warning border-warning/30",
  RECONOCIDA: "bg-success/15 text-success border-success/30",
};

export const ESTADO_PLUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};

export const ESTADO_PLUS_COLORS: Record<string, string> = {
  PENDIENTE: "bg-warning/15 text-warning border-warning/30",
  APROBADO: "bg-success/15 text-success border-success/30",
  RECHAZADO: "bg-danger/15 text-danger border-danger/30",
};

export const ESTADO_EXAMEN_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  APROBADO: "Aprobado",
  SUSPENDIDO: "Suspendido",
};

export const ESTADO_EXAMEN_COLORS: Record<string, string> = {
  PENDIENTE: "bg-warning/15 text-warning border-warning/30",
  APROBADO: "bg-success/15 text-success border-success/30",
  SUSPENDIDO: "bg-danger/15 text-danger border-danger/30",
};

export const ALCANCE_TRAMITE_LABELS: Record<string, string> = {
  INTERNO: "Interno (empleados)",
  EXTERNO: "Externo (ciudadanos)",
};

export const DISPONIBILIDAD_LABELS: Record<string, string> = {
  DISPONIBLE: "Disponible",
  OCUPADO: "Ocupado",
};

export const STAFF_ROLES = [
  "JUEZ_SUPREMO",
  "JUEZ_DISTRITO",
  "FISCAL_GENERAL",
  "FISCAL",
  "DEFENSOR_PUBLICO",
  "ALGUACIL",
] as const;

// Rangos del SAPD (policia), gestionados aparte de los empleados del Departamento de Justicia.
export const SAPD_ROLES = ["ENCARGADO_SAPD", "SAPD"] as const;

// Todos los rangos con cuenta de personal (Justicia + SAPD), sin incluir Civil.
export const TODOS_LOS_RANGOS = [...STAFF_ROLES, ...SAPD_ROLES] as const;

// Rangos a los que un civil puede postular (todos menos Juez Supremo, que es único).
export const POSTULABLE_ROLES = [
  "JUEZ_DISTRITO",
  "FISCAL_GENERAL",
  "FISCAL",
  "DEFENSOR_PUBLICO",
  "ALGUACIL",
] as const;

export const ESTADO_POSTULACION_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
};

export const ESTADO_POSTULACION_COLORS: Record<string, string> = {
  PENDIENTE: "bg-warning/15 text-warning border-warning/30",
  APROBADA: "bg-success/15 text-success border-success/30",
  RECHAZADA: "bg-danger/15 text-danger border-danger/30",
};

export const ESTADO_ORDEN_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  EJECUTADA: "Ejecutada",
};

export const ESTADO_ORDEN_COLORS: Record<string, string> = {
  PENDIENTE: "bg-warning/15 text-warning border-warning/30",
  APROBADA: "bg-success/15 text-success border-success/30",
  RECHAZADA: "bg-danger/15 text-danger border-danger/30",
  EJECUTADA: "bg-info/15 text-info border-info/30",
};

export const TIPOS_ORDEN_JUDICIAL = ["Allanamiento", "Arresto", "Registro", "Intervención de comunicaciones"];

// Meta semanal mínima por empleado, según la postulación (cuota de 5h/semana).
export const OBJETIVO_HORAS_SEMANA = 5;

// Sueldo/hora mínimo permitido para cualquier rango: nunca se puede cobrar 0.
export const TARIFA_HORA_MINIMA = 1;
