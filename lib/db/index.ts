import { readFileSync } from "node:fs";
import type { PgDatabase } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { SUPABASE_CA } from "./supabase-ca";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<any, typeof schema>;
export { schema };

const g = globalThis as { __alumgDb?: Promise<Db>; __alumgSchemaV?: number; __alumgMigrating?: Promise<void> };

// Postgres partout : DATABASE_URL (Neon, Supabase…) en production, PGlite (Postgres embarqué, fichier local) en développement.
// PGLITE_DIR=memory:// donne une base jetable pour les tests.
export async function getDb(): Promise<Db> {
  const db = await (g.__alumgDb ??= init().catch((e) => {
    g.__alumgDb = undefined; // un échec d'initialisation ne doit pas rester en cache
    throw e;
  }));
  await catchUpMigrations(db);
  return db;
}

// Développement, base embarquée : la base ne migre qu'au démarrage du serveur, or `npm run dev` reste lancé pendant qu'on ajoute des migrations. Sans ceci, le nouveau code
// écrit dans des tables qui n'existent pas encore (500 à l'inscription, à la connexion…) jusqu'à un redémarrage. On rejoue donc les migrations quand le journal change.
const journalSize = () => {
  try {
    return (JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as { entries: unknown[] }).entries.length;
  } catch {
    return 0;
  }
};
async function catchUpMigrations(db: Db) {
  if (process.env.NODE_ENV === "production" || process.env.DATABASE_URL || process.env.POSTGRES_URL) return;
  const n = journalSize();
  if (n !== g.__alumgSchemaV) {
    g.__alumgSchemaV = n;
    g.__alumgMigrating = import("drizzle-orm/pglite/migrator")
      .then(({ migrate }) => migrate(db as never, { migrationsFolder: "drizzle" })) // idempotent : seules les migrations manquantes s'appliquent
      .finally(() => { g.__alumgMigrating = undefined; });
  }
  await g.__alumgMigrating; // les requêtes simultanées attendent la même mise à jour
}

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
  const { pg_trgm } = await import("@electric-sql/pglite/contrib/pg_trgm"); // recherche de l'administration (index trigrammes)
  const dir = process.env.PGLITE_DIR ?? ".data/pglite";
  if (!dir.startsWith("memory://")) (await import("node:fs")).mkdirSync(dir, { recursive: true });
  const db = drizzle(new PGlite(dir, { extensions: { pg_trgm } }), { schema });
  await migrate(db, { migrationsFolder });
  g.__alumgSchemaV = journalSize(); // à jour au démarrage : rien à rattraper tant que le journal ne change pas
  return db;
}

function withoutSslmode(url: string) {
  const u = new URL(url);
  u.searchParams.delete("sslmode");
  return u.toString();
}
