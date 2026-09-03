-- CreateTable
CREATE TABLE "PlantillaExamen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "preguntas" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlantillaExamen_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Examen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantillaId" TEXT,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "asignadoPorId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "resultado" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Examen_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "PlantillaExamen" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Examen_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Examen_asignadoPorId_fkey" FOREIGN KEY ("asignadoPorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Examen" ("asignadoPorId", "createdAt", "descripcion", "empleadoId", "estado", "id", "resultado", "titulo") SELECT "asignadoPorId", "createdAt", "descripcion", "empleadoId", "estado", "id", "resultado", "titulo" FROM "Examen";
DROP TABLE "Examen";
ALTER TABLE "new_Examen" RENAME TO "Examen";
CREATE TABLE "new_TipoTramite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "requisitos" TEXT,
    "costo" INTEGER NOT NULL DEFAULT 0,
    "alcance" TEXT NOT NULL DEFAULT 'EXTERNO',
    "activo" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_TipoTramite" ("activo", "costo", "descripcion", "id", "nombre", "requisitos") SELECT "activo", "costo", "descripcion", "id", "nombre", "requisitos" FROM "TipoTramite";
DROP TABLE "TipoTramite";
ALTER TABLE "new_TipoTramite" RENAME TO "TipoTramite";
CREATE UNIQUE INDEX "TipoTramite_nombre_key" ON "TipoTramite"("nombre");
CREATE TABLE "new_User" (
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
    "disponibilidad" TEXT NOT NULL DEFAULT 'DISPONIBLE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("activo", "apellidos", "cargo", "createdAt", "discordId", "dni", "email", "id", "legajo", "nombre", "passwordHash", "role", "telefono", "updatedAt") SELECT "activo", "apellidos", "cargo", "createdAt", "discordId", "dni", "email", "id", "legajo", "nombre", "passwordHash", "role", "telefono", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_dni_key" ON "User"("dni");
CREATE UNIQUE INDEX "User_legajo_key" ON "User"("legajo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
