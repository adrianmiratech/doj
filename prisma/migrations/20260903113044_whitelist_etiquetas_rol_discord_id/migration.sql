-- CreateTable
CREATE TABLE "Etiqueta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "AlertaWhitelist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "nota" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RolDiscordId" (
    "role" TEXT NOT NULL PRIMARY KEY,
    "discordRoleId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_EtiquetaToInforme" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_EtiquetaToInforme_A_fkey" FOREIGN KEY ("A") REFERENCES "Etiqueta" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_EtiquetaToInforme_B_fkey" FOREIGN KEY ("B") REFERENCES "Informe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RespuestaPostulacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postulacionId" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL,
    CONSTRAINT "RespuestaPostulacion_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "Postulacion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RespuestaPostulacion_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "PreguntaPostulacion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RespuestaPostulacion" ("id", "postulacionId", "preguntaId", "respuesta") SELECT "id", "postulacionId", "preguntaId", "respuesta" FROM "RespuestaPostulacion";
DROP TABLE "RespuestaPostulacion";
ALTER TABLE "new_RespuestaPostulacion" RENAME TO "RespuestaPostulacion";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Etiqueta_nombre_key" ON "Etiqueta"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "AlertaWhitelist_tipo_valor_key" ON "AlertaWhitelist"("tipo", "valor");

-- CreateIndex
CREATE UNIQUE INDEX "_EtiquetaToInforme_AB_unique" ON "_EtiquetaToInforme"("A", "B");

-- CreateIndex
CREATE INDEX "_EtiquetaToInforme_B_index" ON "_EtiquetaToInforme"("B");
