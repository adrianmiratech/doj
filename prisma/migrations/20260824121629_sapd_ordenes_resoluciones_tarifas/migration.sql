-- CreateTable
CREATE TABLE "TarifaRango" (
    "role" TEXT NOT NULL PRIMARY KEY,
    "tarifaHora" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "OrdenJudicial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "objetivo" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "solicitanteId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "respuesta" TEXT,
    "resueltaPorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrdenJudicial_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrdenJudicial_resueltaPorId_fkey" FOREIGN KEY ("resueltaPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Resolucion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "casoId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Resolucion_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Resolucion_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PreguntaPostulacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rango" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "RespuestaPostulacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postulacionId" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL,
    CONSTRAINT "RespuestaPostulacion_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "Postulacion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RespuestaPostulacion_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "PreguntaPostulacion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Fichaje" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "entrada" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salida" DATETIME,
    "actividad" TEXT NOT NULL DEFAULT 'Atencion al publico',
    "alertado4h" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Fichaje_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Fichaje" ("actividad", "entrada", "id", "salida", "userId") SELECT "actividad", "entrada", "id", "salida", "userId" FROM "Fichaje";
DROP TABLE "Fichaje";
ALTER TABLE "new_Fichaje" RENAME TO "Fichaje";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
