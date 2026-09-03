/*
  Warnings:

  - Added the required column `semana` to the `Plus` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Plus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "semana" TEXT NOT NULL,
    "notas" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Plus_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "TipoPlus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Plus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Plus" ("createdAt", "estado", "id", "tipoId", "userId") SELECT "createdAt", "estado", "id", "tipoId", "userId" FROM "Plus";
DROP TABLE "Plus";
ALTER TABLE "new_Plus" RENAME TO "Plus";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
