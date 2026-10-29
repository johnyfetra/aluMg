import type { PgDatabase } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { SUPABASE_CA } from "./supabase-ca";

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
  // jamais de base locale éphémère par accident en production : DATABASE_URL (ou PGLITE_DIR explicite) est obligatoire
  // Supabase (intégration Vercel) fournit POSTGRES_URL (pooler) ; DATABASE_URL reste prioritaire
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (process.env.NODE_ENV === "production" && !url && !process.env.PGLITE_DIR) throw new Error("DATABASE_URL manquant en production");
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const db = drizzle(new Pool({
      // sslmode retiré de l'URL (sinon pg l'impose et ignore `ssl`) ; la vérification du certificat reste complète, avec la CA Supabase en plus
      connectionString: withoutSslmode(url),
      ssl: /supabase\.(com|co)/.test(url) ? { ca: SUPABASE_CA } : undefined,
      max: 3, // serverless : peu de connexions par instance
    }), { schema });
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

function withoutSslmode(url: string) {
  const u = new URL(url);
  u.searchParams.delete("sslmode");
  return u.toString();
}
