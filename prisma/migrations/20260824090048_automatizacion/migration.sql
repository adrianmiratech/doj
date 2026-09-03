-- CreateTable
CREATE TABLE "CasoParte" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "casoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'Involucrado',
    CONSTRAINT "CasoParte_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CasoParte_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SolicitudFalta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportadoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "gravedad" TEXT NOT NULL DEFAULT 'LEVE',
    "evidencias" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "faltaId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SolicitudFalta_reportadoId_fkey" FOREIGN KEY ("reportadoId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SolicitudFalta_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ContratoLaboral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "puesto" TEXT NOT NULL,
    "salarioBase" INTEGER NOT NULL,
    "condiciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE_FIRMA',
    "fechaInicio" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContratoLaboral_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ContratoLaboral" ("condiciones", "estado", "fechaInicio", "id", "puesto", "salarioBase", "userId") SELECT "condiciones", "estado", "fechaInicio", "id", "puesto", "salarioBase", "userId" FROM "ContratoLaboral";
DROP TABLE "ContratoLaboral";
ALTER TABLE "new_ContratoLaboral" RENAME TO "ContratoLaboral";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CasoParte_casoId_userId_key" ON "CasoParte"("casoId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitudFalta_faltaId_key" ON "SolicitudFalta"("faltaId");
