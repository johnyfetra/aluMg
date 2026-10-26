import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb, schema } from "./db";
import { hashPassword, verifyPassword } from "./password";
import { isVerified } from "./verify";

export { hashPassword, verifyPassword };

export const COOKIE = "alumg_session";
const SESSION_DAYS = 30;

const sha = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  const db = await getDb();
  const jar = await cookies();
  // rotation : l'éventuelle session précédente de ce navigateur est supprimée (pas de fixation de session) ; les sessions périmées du compte sont purgées
  const old = jar.get(COOKIE)?.value;
  if (old) await db.delete(schema.sessions).where(eq(schema.sessions.id, sha(old)));
  await db.delete(schema.sessions).where(and(eq(schema.sessions.userId, userId), lt(schema.sessions.expiresAt, new Date())));
  await db.insert(schema.sessions).values({ id: sha(token), userId, expiresAt });
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await (await getDb()).delete(schema.sessions).where(eq(schema.sessions.id, sha(token)));
  jar.delete(COOKIE);
}

// email : chaîne vide si le compte n'en a pas ; verified : un canal (SMS, appel ou e-mail) a été confirmé.
// Après un changement de mot de passe : toutes les autres sessions du compte sont coupées (celle-ci reste).
export async function destroyOtherSessions(userId: string) {
  const token = (await cookies()).get(COOKIE)?.value;
  const db = await getDb();
  await db.delete(schema.sessions).where(token ? and(eq(schema.sessions.userId, userId), ne(schema.sessions.id, sha(token))) : eq(schema.sessions.userId, userId));
}

export type SessionUser = { id: string; email: string; name: string; phone: string; avatar: string; role: "client" | "menuisier" | "admin"; verified: boolean };

export async function currentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const [row] = await db
    .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name, phone: schema.users.phone, avatar: schema.users.avatar, role: schema.users.role, pv: schema.users.phoneVerifiedAt, ev: schema.users.emailVerifiedAt })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, sha(token)), gt(schema.sessions.expiresAt, new Date())));
  return row ? { id: row.id, email: row.email ?? "", name: row.name, phone: row.phone, avatar: row.avatar, role: row.role, verified: isVerified({ phoneVerifiedAt: row.pv, emailVerifiedAt: row.ev }) } : null;
}
