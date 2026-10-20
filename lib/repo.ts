import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { type Quote, type QuoteRequest, type Role, type Settings, withDefaults } from "./model";

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

// Numéro DV-AAAA-NNNN attribué de façon atomique (compteur en base) : jamais choisi par le client.
async function nextNumber(userId: string) {
  const db = await getDb();
  await db.insert(schema.settings).values({ userId }).onConflictDoNothing();
  const [{ counter }] = await db
    .update(schema.settings)
    .set({ counter: sql`${schema.settings.counter} + 1` })
    .where(eq(schema.settings.userId, userId))
    .returning({ counter: sql<number>`${schema.settings.counter} - 1` });
  return `DV-${new Date().getFullYear()}-${String(counter).padStart(4, "0")}`;
}

// Crée un devis. clientId / request ne viennent jamais du corps de la requête : seul createRequest (côté client) les renseigne.
export async function createQuote(userId: string, q: Quote, opts: { clientId?: string | null; request?: QuoteRequest | null } = {}): Promise<Quote> {
  const db = await getDb();
  const clientId = opts.clientId ?? null;
  const saved: Quote = {
    ...q,
    number: await nextNumber(userId),
    date: new Date().toISOString(),
    clientId,
    request: opts.request ?? null,
    progress: 0,
    // « requested » n'existe que pour une demande de client
    status: !clientId && q.status === "requested" ? "draft" : q.status,
  };
  await db.insert(schema.quotes).values({ id: saved.id, userId, number: saved.number, status: saved.status, clientId, progress: 0, data: saved });
  return saved;
}

export async function updateQuote(userId: string, id: string, q: Quote): Promise<Quote | null> {
  const existing = await getQuote(userId, id);
  if (!existing) return null;
  // Numéro, date, conditions, client, demande et avancement ne changent jamais par cette voie.
  // Pour un devis lié à un client, le statut ne bouge que par les actions (envoi, acceptation…) ; une demande modifiée passe en préparation.
  let status = q.status;
  if (existing.clientId) status = existing.status === "requested" ? "draft" : existing.status;
  else if (status === "requested") status = "draft";
  const saved: Quote = { ...q, id, number: existing.number, date: existing.date, terms: existing.terms, clientId: existing.clientId ?? null, request: existing.request ?? null, progress: existing.progress ?? 0, status };
  const db = await getDb();
  await db.update(schema.quotes).set({ status: saved.status, data: saved }).where(and(eq(schema.quotes.id, id), eq(schema.quotes.userId, userId)));
  return saved;
}

// « locked » : un chantier accepté d'un client ne se supprime pas (il a un historique et peut avoir une évaluation).
export async function deleteQuote(userId: string, id: string): Promise<boolean | "locked"> {
  const existing = await getQuote(userId, id);
  if (!existing) return false;
  if (existing.clientId && ["accepted", "in_progress", "completed"].includes(existing.status)) return "locked";
  const db = await getDb();
  const r = await db.delete(schema.quotes).where(and(eq(schema.quotes.id, id), eq(schema.quotes.userId, userId))).returning({ id: schema.quotes.id });
  return r.length > 0;
}

export async function createUser(email: string, name: string, passwordHash: string, role: Role = "client", phone = "") {
  const db = await getDb();
  const [u] = await db.insert(schema.users).values({ email: email.toLowerCase(), name, passwordHash, role, phone }).onConflictDoNothing().returning({ id: schema.users.id });
  if (u && role === "menuisier") await db.insert(schema.settings).values({ userId: u.id }).onConflictDoNothing();
  return u?.id ?? null; // null : e-mail déjà utilisé
}

export async function findUserById(id: string) {
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  return u ?? null;
}

export async function findUserByEmail(email: string) {
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase()));
  return u ?? null;
}
