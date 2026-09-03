-- AlterTable
ALTER TABLE "ConversacionParticipante" ADD COLUMN "presenteHasta" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "anonimo" BOOLEAN NOT NULL DEFAULT false,
    "autorId" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "discordMessageId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feedback_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Feedback" ("anonimo", "autorId", "contenido", "createdAt", "id", "tipo") SELECT "anonimo", "autorId", "contenido", "createdAt", "id", "tipo" FROM "Feedback";
DROP TABLE "Feedback";
ALTER TABLE "new_Feedback" RENAME TO "Feedback";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
