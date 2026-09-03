-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "telefono" TEXT,
    "discordId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CIVIL',
    "cargo" TEXT,
    "legajo" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TipoTramite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "requisitos" TEXT,
    "costo" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Tramite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipoId" TEXT NOT NULL,
    "ciudadanoId" TEXT NOT NULL,
    "empleadoId" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "detalle" TEXT NOT NULL,
    "respuesta" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tramite_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "TipoTramite" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Tramite_ciudadanoId_fkey" FOREIGN KEY ("ciudadanoId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Tramite_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Solicitud" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "asunto" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "ciudadanoId" TEXT NOT NULL,
    "empleadoId" TEXT,
    "respuesta" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Solicitud_ciudadanoId_fkey" FOREIGN KEY ("ciudadanoId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Solicitud_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Caso" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expediente" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTO',
    "responsableId" TEXT NOT NULL,
    "partes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Caso_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotaCaso" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "casoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotaCaso_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NotaCaso_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Audiencia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "casoId" TEXT NOT NULL,
    "juezId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "lugar" TEXT NOT NULL DEFAULT 'Sala de Audiencias 1',
    "notas" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Audiencia_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Audiencia_juezId_fkey" FOREIGN KEY ("juezId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Fichaje" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "entrada" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salida" DATETIME,
    "actividad" TEXT NOT NULL DEFAULT 'Atencion al publico',
    CONSTRAINT "Fichaje_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contrato" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "partes" TEXT NOT NULL,
    "detalle" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE_FIRMA',
    "redactorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contrato_redactorId_fkey" FOREIGN KEY ("redactorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Falta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empleadoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "gravedad" TEXT NOT NULL DEFAULT 'LEVE',
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Falta_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Falta_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Nomina" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "importe" INTEGER NOT NULL DEFAULT 0,
    "detalle" TEXT,
    "acordada" BOOLEAN NOT NULL DEFAULT false,
    "pagada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Nomina_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TipoPlus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "monto" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Plus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Plus_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "TipoPlus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Plus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContratoLaboral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "puesto" TEXT NOT NULL,
    "salarioBase" INTEGER NOT NULL,
    "condiciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "fechaInicio" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContratoLaboral_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Medalla" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "bonoNomina" INTEGER NOT NULL DEFAULT 0,
    "objetivo" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "MedallaProgreso" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "medallaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "progreso" INTEGER NOT NULL DEFAULT 0,
    "conseguida" BOOLEAN NOT NULL DEFAULT false,
    "fechaConseguida" DATETIME,
    CONSTRAINT "MedallaProgreso_medallaId_fkey" FOREIGN KEY ("medallaId") REFERENCES "Medalla" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MedallaProgreso_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Examen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "asignadoPorId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "resultado" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Examen_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Examen_asignadoPorId_fkey" FOREIGN KEY ("asignadoPorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Informe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Informe_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "anonimo" BOOLEAN NOT NULL DEFAULT false,
    "autorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feedback_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_dni_key" ON "User"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "User_legajo_key" ON "User"("legajo");

-- CreateIndex
CREATE UNIQUE INDEX "TipoTramite_nombre_key" ON "TipoTramite"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Caso_expediente_key" ON "Caso"("expediente");

-- CreateIndex
CREATE UNIQUE INDEX "TipoPlus_nombre_key" ON "TipoPlus"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Medalla_nombre_key" ON "Medalla"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "MedallaProgreso_medallaId_userId_key" ON "MedallaProgreso"("medallaId", "userId");
