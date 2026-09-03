-- CreateTable
CREATE TABLE "RolTotp" (
    "role" TEXT NOT NULL PRIMARY KEY,
    "obligatorio" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "AccesoLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "ip" TEXT,
    "exito" BOOLEAN NOT NULL,
    "motivo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "dni" TEXT,
    "telefono" TEXT,
    "discordId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CIVIL',
    "cargo" TEXT,
    "legajo" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "suspendidoHasta" DATETIME,
    "avatarUrl" TEXT,
    "disponibilidad" TEXT NOT NULL DEFAULT 'DISPONIBLE',
    "ultimoAcceso" DATETIME,
    "totpSecret" TEXT,
    "totpHabilitado" BOOLEAN NOT NULL DEFAULT false,
    "tourCompletado" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("activo", "apellidos", "avatarUrl", "cargo", "createdAt", "discordId", "disponibilidad", "dni", "email", "id", "legajo", "nombre", "passwordHash", "role", "suspendidoHasta", "telefono", "ultimoAcceso", "updatedAt") SELECT "activo", "apellidos", "avatarUrl", "cargo", "createdAt", "discordId", "disponibilidad", "dni", "email", "id", "legajo", "nombre", "passwordHash", "role", "suspendidoHasta", "telefono", "ultimoAcceso", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_dni_key" ON "User"("dni");
CREATE UNIQUE INDEX "User_legajo_key" ON "User"("legajo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AccesoLog_createdAt_idx" ON "AccesoLog"("createdAt");

-- CreateIndex
CREATE INDEX "AccesoLog_email_idx" ON "AccesoLog"("email");
