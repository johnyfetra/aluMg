import { sql } from "drizzle-orm";
import { getDb, schema } from "./db";

// Limitation de débit à fenêtre fixe, atomique (un seul UPSERT) : au-delà de `limit` appels par `windowSec` secondes, la clé est refusée.
// RATE_LIMIT=off la désactive (tests de bout en bout seulement).
export type RateResult = { ok: true } | { ok: false; retryAfter: number };

export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateResult> {
  if (process.env.RATE_LIMIT === "off") return { ok: true };
  const db = await getDb();
  const t = schema.rateLimits;
  const expired = sql`${t.windowStart} < now() - make_interval(secs => ${windowSec})`;
  const [row] = await db
    .insert(t)
    .values({ key, count: 1 })
    .onConflictDoUpdate({
      target: t.key,
      set: {
        count: sql`case when ${expired} then 1 else ${t.count} + 1 end`,
        windowStart: sql`case when ${expired} then now() else ${t.windowStart} end`,
      },
    })
    .returning({ count: t.count, left: sql<number>`greatest(1, ceil(extract(epoch from (${t.windowStart} + make_interval(secs => ${windowSec}) - now()))))::int` });
  return row.count > limit ? { ok: false, retryAfter: row.left } : { ok: true };
}

// Nettoyage des fenêtres périmées (à appeler de temps en temps ; sans effet sur la justesse).
export async function purgeRateLimits() {
  const db = await getDb();
  await db.delete(schema.rateLimits).where(sql`${schema.rateLimits.windowStart} < now() - interval '1 day'`);
}
