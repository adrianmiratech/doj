-- CreateTable
CREATE TABLE "ConfigSeguridad" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "escaneoActivo" BOOLEAN NOT NULL DEFAULT true,
    "ventanaRaidMs" INTEGER NOT NULL DEFAULT 10000,
    "umbralRaid" INTEGER NOT NULL DEFAULT 5,
    "ventanaNukeMs" INTEGER NOT NULL DEFAULT 30000,
    "umbralNuke" INTEGER NOT NULL DEFAULT 3,
    "ventanaSancionesMs" INTEGER NOT NULL DEFAULT 30000,
    "umbralSanciones" INTEGER NOT NULL DEFAULT 3,
    "umbralBorradoMasivo" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MensajeProgramado" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "channelNombre" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "enviarEn" DATETIME NOT NULL,
    "enviado" BOOLEAN NOT NULL DEFAULT false,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MensajeProgramado_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MensajeProgramado_enviado_enviarEn_idx" ON "MensajeProgramado"("enviado", "enviarEn");
