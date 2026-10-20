import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { type Quote, type Settings, withDefaults } from "./model";

// Accès aux données, toujours borné à un utilisateur (userId) : un compte ne lit ni n'écrit les données d'un autre.

export async function getSettings(userId: string): Promise<Settings> {
  const db = await getDb();
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.userId, userId));
  return withDefaults(row?.data);
}

export async function saveSettings(userId: string, data: Settings) {
  const db = await getDb();
  await db.insert(schema.settings).values({ userId, data }).onConflictDoUpdate({ target: schema.settings.userId, set: { data } });
}

export async function listQuotes(userId: string): Promise<Quote[]> {
  const db = await getDb();
  const rows = await db.select({ data: schema.quotes.data }).from(schema.quotes).where(eq(schema.quotes.userId, userId)).orderBy(desc(schema.quotes.createdAt));
  return rows.map((r) => r.data);
}

export async function getQuote(userId: string, id: string) {
  const db = await getDb();
  const [row] = await db.select({ data: schema.quotes.data }).from(schema.quotes).where(and(eq(schema.quotes.id, id), eq(schema.quotes.userId, userId)));
  return row?.data ?? null;
}

// Le numéro est attribué ici, de façon atomique (compteur en base) : jamais choisi par le client.
export async function createQuote(userId: string, q: Quote): Promise<Quote> {
  const db = await getDb();
  await db.insert(schema.settings).values({ userId }).onConflictDoNothing();
  const [{ counter }] = await db
    .update(schema.settings)
    .set({ counter: sql`${schema.settings.counter} + 1` })
    .where(eq(schema.settings.userId, userId))
    .returning({ counter: sql<number>`${schema.settings.counter} - 1` });
  const saved: Quote = { ...q, number: `DV-${new Date().getFullYear()}-${String(counter).padStart(4, "0")}`, date: new Date().toISOString() };
  await db.insert(schema.quotes).values({ id: saved.id, userId, number: saved.number, status: saved.status, data: saved });
  return saved;
}

export async function updateQuote(userId: string, id: string, q: Quote): Promise<Quote | null> {
  const existing = await getQuote(userId, id);
  if (!existing) return null;
  // numéro, date et conditions d'émission ne changent jamais après la création
  const saved: Quote = { ...q, id, number: existing.number, date: existing.date, terms: existing.terms };
  const db = await getDb();
  await db.update(schema.quotes).set({ status: saved.status, data: saved }).where(and(eq(schema.quotes.id, id), eq(schema.quotes.userId, userId)));
  return saved;
}

export async function deleteQuote(userId: string, id: string) {
  const db = await getDb();
  const r = await db.delete(schema.quotes).where(and(eq(schema.quotes.id, id), eq(schema.quotes.userId, userId))).returning({ id: schema.quotes.id });
  return r.length > 0;
}

export async function createUser(email: string, name: string, passwordHash: string) {
  const db = await getDb();
  const [u] = await db.insert(schema.users).values({ email: email.toLowerCase(), name, passwordHash }).onConflictDoNothing().returning({ id: schema.users.id });
  if (u) await db.insert(schema.settings).values({ userId: u.id }).onConflictDoNothing();
  return u?.id ?? null; // null : e-mail déjà utilisé
}

export async function findUserByEmail(email: string) {
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase()));
  return u ?? null;
}
