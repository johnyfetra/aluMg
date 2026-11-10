import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { madaDay } from "./booking";
import { getDb, schema } from "./db";

// Mesure d'audience du site public, sans cookie : visiteurs uniques par jour et pages vues.
// Ni l'adresse ni le navigateur ne sont gardés, seulement leur empreinte du jour (sel + jour : non réversible, non reliable d'un jour à l'autre).
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|curl|wget|python|node-fetch/i;
const SALT = process.env.VISIT_SALT ?? "alumg-visites";

export const isBot = (ua: string) => !ua || BOT.test(ua);
export const visitorHash = (ip: string, ua: string, day: string) => createHash("sha256").update(`${SALT}|${day}|${ip}|${ua}`).digest("hex").slice(0, 32);

export async function recordVisit(ip: string, ua: string, now = new Date()) {
  if (isBot(ua)) return false;
  const day = madaDay(now);
  const db = await getDb();
  const t = schema.visits;
  await db.insert(t).values({ day, visitor: visitorHash(ip, ua, day) }).onConflictDoUpdate({ target: [t.day, t.visitor], set: { views: sql`${t.views} + 1` } });
  return true;
}
