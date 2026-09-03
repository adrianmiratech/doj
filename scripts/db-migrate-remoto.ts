import "dotenv/config";
import { createClient } from "@libsql/client";
import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Aplica a la base remota (Turso) las migraciones de prisma/migrations que
 * todavía no tenga. Hace falta este script propio porque el motor de
 * `prisma migrate deploy` no reconoce el esquema "libsql://" (solo "file:"),
 * así que no puede conectarse directo a Turso. Uso: npm run db:migrate-remoto
 * (después de `prisma migrate dev` en local, para llevar el cambio a producción).
 */
async function main() {
  if (!process.env.DATABASE_URL?.startsWith("libsql:")) {
    throw new Error("DATABASE_URL debe apuntar a una base remota (libsql://...). No hace falta este script contra un archivo local.");
  }
  if (!process.env.DATABASE_AUTH_TOKEN) {
    throw new Error("Falta DATABASE_AUTH_TOKEN en el .env.");
  }

  const remoto = createClient({ url: process.env.DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN });

  await remoto.execute(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
      "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
    )
  `);

  const aplicadas = new Set(
    (await remoto.execute('SELECT migration_name FROM "_prisma_migrations"')).rows.map((r) => String(r.migration_name)),
  );

  const dirMigraciones = path.join(process.cwd(), "prisma", "migrations");
  const carpetas = readdirSync(dirMigraciones, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const pendientes = carpetas.filter((c) => !aplicadas.has(c));
  if (pendientes.length === 0) {
    console.log("La base remota ya tiene todas las migraciones aplicadas.");
    return;
  }

  console.log(`Aplicando ${pendientes.length} migración(es) pendientes: ${pendientes.join(", ")}`);
  for (const carpeta of pendientes) {
    const sql = readFileSync(path.join(dirMigraciones, carpeta, "migration.sql"), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");

    await remoto.executeMultiple(sql);
    await remoto.execute({
      sql: `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
            VALUES (?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, 1)`,
      args: [randomUUID(), checksum, carpeta],
    });
    console.log(`  ✓ ${carpeta}`);
  }
  console.log("Listo.");
}

main().catch((error) => {
  console.error("Error aplicando migraciones a la base remota:", error);
  process.exit(1);
});
