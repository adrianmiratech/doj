-- CreateTable
CREATE TABLE "Conversacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ConversacionParticipante" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversacionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ultimaLectura" DATETIME,
    CONSTRAINT "ConversacionParticipante_conversacionId_fkey" FOREIGN KEY ("conversacionId") REFERENCES "Conversacion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ConversacionParticipante_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Mensaje" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversacionId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Mensaje_conversacionId_fkey" FOREIGN KEY ("conversacionId") REFERENCES "Conversacion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Mensaje_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ConversacionParticipante_conversacionId_userId_key" ON "ConversacionParticipante"("conversacionId", "userId");
