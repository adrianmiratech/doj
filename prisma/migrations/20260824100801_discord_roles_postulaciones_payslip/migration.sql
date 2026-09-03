-- CreateTable
CREATE TABLE "Postulacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidatoId" TEXT NOT NULL,
    "rango" TEXT NOT NULL,
    "motivacion" TEXT NOT NULL,
    "experiencia" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "respuesta" TEXT,
    "revisadaPorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Postulacion_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Postulacion_revisadaPorId_fkey" FOREIGN KEY ("revisadaPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Nomina" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "numeroSemana" INTEGER NOT NULL DEFAULT 1,
    "inicio" DATETIME,
    "fin" DATETIME,
    "horas" REAL NOT NULL DEFAULT 0,
    "tarifa" INTEGER NOT NULL DEFAULT 0,
    "importe" INTEGER NOT NULL DEFAULT 0,
    "detalle" TEXT,
    "acordada" BOOLEAN NOT NULL DEFAULT false,
    "pagada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Nomina_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Nomina" ("acordada", "createdAt", "detalle", "id", "importe", "pagada", "periodo", "userId") SELECT "acordada", "createdAt", "detalle", "id", "importe", "pagada", "periodo", "userId" FROM "Nomina";
DROP TABLE "Nomina";
ALTER TABLE "new_Nomina" RENAME TO "Nomina";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
