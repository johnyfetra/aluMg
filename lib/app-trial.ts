import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "./db";

// Essai de l'application Android locale : le premier appel d'un appareil fixe le début de l'essai, les suivants le relisent.
// La date vient du serveur : changer l'heure du téléphone ou réinstaller l'application ne relance rien.
export const TRIAL_DAYS = 14;
export const trialSchema = z.object({ device: z.string().trim().min(8).max(128) });
const SALT = process.env.VISIT_SALT ?? "alumg-visites";
export const deviceHash = (device: string) => createHash("sha256").update(`${SALT}|app|${device}`).digest("hex").slice(0, 40);

export async function checkTrial(device: string, now = new Date()) {
  const db = await getDb();
  const t = schema.appTrials;
  const [row] = await db
    .insert(t)
    .values({ device: deviceHash(device), startedAt: now, lastSeen: now })
    .onConflictDoUpdate({ target: t.device, set: { lastSeen: now, checks: sql`${t.checks} + 1` } })
    .returning({ startedAt: t.startedAt });
  return { startedAt: row.startedAt.toISOString(), now: now.toISOString(), days: TRIAL_DAYS };
}
