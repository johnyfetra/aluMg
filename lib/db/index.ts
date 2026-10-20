import type { PgDatabase } from "drizzle-orm/pg-core";
import * as schema from "./schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<any, typeof schema>;
export { schema };

const g = globalThis as { __alumgDb?: Promise<Db> };

// Postgres partout : DATABASE_URL (Neon, Supabase…) en production, PGlite (Postgres embarqué, fichier local) en développement.
// PGLITE_DIR=memory:// donne une base jetable pour les tests.
export const getDb = () =>
  (g.__alumgDb ??= init().catch((e) => {
    g.__alumgDb = undefined; // un échec d'initialisation ne doit pas rester en cache
    throw e;
  }));

async function init(): Promise<Db> {
  const migrationsFolder = "drizzle";
  if (process.env.DATABASE_URL) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });
    await migrate(db, { migrationsFolder });
    return db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.PGLITE_DIR ?? ".data/pglite";
  if (!dir.startsWith("memory://")) (await import("node:fs")).mkdirSync(dir, { recursive: true });
  const db = drizzle(new PGlite(dir), { schema });
  await migrate(db, { migrationsFolder });
  return db;
}
