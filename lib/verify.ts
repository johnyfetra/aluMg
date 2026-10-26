import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { maskEmail, maskPhone } from "./phone";
import { getSender, type Lang } from "./senders";

// Vérification du compte : un code à 6 chiffres envoyé par SMS, appel vocal ou e-mail. Un seul canal suffit.
// Garde-fous : validité 10 min, 5 essais par code, un nouveau code invalide les précédents, délai entre deux envois.
export const CHANNELS = ["sms", "call", "email"] as const;
export type Channel = (typeof CHANNELS)[number];
export const CODE_TTL_MS = 10 * 60_000;
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_S = 30;

const hash = (id: string, userId: string, code: string) => createHash("sha256").update(`${id}:${userId}:${code}`).digest();

export type VerifyUser = { phoneVerifiedAt: Date | null; emailVerifiedAt: Date | null };
export const isVerified = (u: VerifyUser) => !!(u.phoneVerifiedAt || u.emailVerifiedAt);

export type SendOutcome =
  | { ok: true; channel: Channel; to: string; expiresInS: number; cooldownS: number; devCode?: string }
  | { ok: false; error: "not_found" | "channel_unavailable" | "no_target" | "cooldown" | "send_failed" | "already_verified"; retryAfter?: number };

export async function availableChannels(userId: string): Promise<Channel[]> {
  const db = await getDb();
  const [u] = await db.select({ phone: schema.users.phoneNorm, email: schema.users.email }).from(schema.users).where(eq(schema.users.id, userId));
  if (!u) return [];
  return getSender().channels().filter((c) => (c === "email" ? !!u.email : !!u.phone));
}

export async function sendCode(userId: string, channel: Channel, lang: Lang = "fr"): Promise<SendOutcome> {
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!u) return { ok: false, error: "not_found" };
  if (isVerified(u)) return { ok: false, error: "already_verified" };
  if (!getSender().channels().includes(channel)) return { ok: false, error: "channel_unavailable" };
  const target = channel === "email" ? u.email : u.phoneNorm;
  if (!target) return { ok: false, error: "no_target" };

  const [last] = await db.select({ at: schema.verifications.createdAt }).from(schema.verifications).where(eq(schema.verifications.userId, userId)).orderBy(desc(schema.verifications.createdAt)).limit(1);
  const wait = last ? RESEND_COOLDOWN_S - Math.floor((Date.now() - last.at.getTime()) / 1000) : 0;
  if (wait > 0) return { ok: false, error: "cooldown", retryAfter: wait };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  await db.transaction(async (tx) => {
    await tx.update(schema.verifications).set({ consumedAt: new Date() }).where(and(eq(schema.verifications.userId, userId), isNull(schema.verifications.consumedAt)));
    await tx.insert(schema.verifications).values({ id, userId, channel, target, codeHash: hash(id, userId, code).toString("hex"), expiresAt });
  });
  try {
    const r = await getSender().send(channel, target, code, lang);
    return { ok: true, channel, to: channel === "email" ? maskEmail(target) : maskPhone(target), expiresInS: CODE_TTL_MS / 1000, cooldownS: RESEND_COOLDOWN_S, ...(r.devCode ? { devCode: r.devCode } : {}) };
  } catch {
    await db.delete(schema.verifications).where(eq(schema.verifications.id, id)); // le code n'est jamais parti : on ne bloque pas l'utilisateur
    return { ok: false, error: "send_failed" };
  }
}

export type ConfirmOutcome = { ok: true; channel: Channel } | { ok: false; error: "no_pending" | "wrong_code" | "locked"; attemptsLeft?: number };

export async function confirmCode(userId: string, code: string): Promise<ConfirmOutcome> {
  const db = await getDb();
  const v = schema.verifications;
  const [row] = await db.select().from(v).where(and(eq(v.userId, userId), isNull(v.consumedAt), gt(v.expiresAt, new Date()))).orderBy(desc(v.createdAt)).limit(1);
  if (!row) return { ok: false, error: "no_pending" };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "locked" };
  // l'essai est compté AVANT la comparaison (atomique) : des requêtes parallèles ne multiplient pas les tentatives
  const [counted] = await db.update(v).set({ attempts: sql`${v.attempts} + 1` }).where(and(eq(v.id, row.id), isNull(v.consumedAt), sql`${v.attempts} < ${MAX_ATTEMPTS}`)).returning({ attempts: v.attempts });
  if (!counted) return { ok: false, error: "locked" };
  const given = hash(row.id, userId, code.replace(/\s/g, ""));
  const expected = Buffer.from(row.codeHash, "hex");
  if (!(given.length === expected.length && timingSafeEqual(given, expected))) {
    return { ok: false, error: counted.attempts >= MAX_ATTEMPTS ? "locked" : "wrong_code", attemptsLeft: Math.max(0, MAX_ATTEMPTS - counted.attempts) };
  }
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(v).set({ consumedAt: now }).where(eq(v.id, row.id));
    await tx.update(schema.users).set(row.channel === "email" ? { emailVerifiedAt: now } : { phoneVerifiedAt: now }).where(eq(schema.users.id, userId));
  });
  return { ok: true, channel: row.channel as Channel };
}
