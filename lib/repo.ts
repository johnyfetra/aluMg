import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { notify } from "./notifications";
import { normalizePhone } from "./phone";
import { type Market, type Quote, type QuoteRequest, type Role, type Settings, withDefaults } from "./model";

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

// Un devis envoyé (ou accepté, refusé, en cours, terminé) n'est plus modifiable : ses lignes, prix et remise sont figés pour que le client
// voie toujours ce qu'il a reçu ou accepté. Pour le changer : négociation (devis lié à un client) ou nouvelle version (devis sans compte).
// Un devis sans compte client garde seulement son menu de statut libre.
export const EDITABLE = ["requested", "draft", "negotiation"];
// Envoyé mais pas encore tranché par le client : le menuisier peut encore corriger (chaque correction crée une révision, le client en est averti).
const REVISABLE = ["sent"];
// Comparaison indépendante de l'ordre des clés (le JSONB de la base les réordonne).
const canon = (v: unknown): unknown => (Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canon(x)])) : v);
const content = (q: Quote) => JSON.stringify(canon([{ ...q.client, email: q.client.email ?? "" }, q.project, q.delay, q.notes, q.lines, q.discount ?? 0, q.services ?? [], q.warranty ?? 0]));

// Condition « le devis est toujours dans l'état que j'ai lu » (statut + révision) : évite qu'une écriture concurrente (décision du client,
// révision du menuisier) en écrase une autre sans bruit.
export const unchanged = (status: string, rev: number) => and(eq(schema.quotes.status, status), sql`coalesce((${schema.quotes.data}->>'rev')::int, 0) = ${rev}`);
export class StaleQuote extends Error {}

export async function updateQuote(userId: string, id: string, q: Quote): Promise<Quote | null | "locked" | "incomplete"> {
  const existing = await getQuote(userId, id);
  if (!existing) return null;
  if (!EDITABLE.includes(existing.status) && !(existing.clientId && REVISABLE.includes(existing.status))) {
    if (existing.clientId) return "locked";
    if (content(existing) !== content(q)) return "locked"; // seul le statut peut changer
  }
  // Numéro, date, conditions, client, demande et avancement ne changent jamais par cette voie.
  // Pour un devis lié à un client, le statut ne bouge que par les actions (envoi, acceptation…) ; une demande modifiée passe en préparation.
  let status = q.status;
  if (existing.clientId) status = existing.status === "requested" ? "draft" : existing.status;
  else if (status === "requested") status = "draft";
  if (existing.clientId && existing.status === "sent" && q.lines.some((l) => !(l.unit > 0))) return "incomplete"; // le client ne doit pas pouvoir accepter une ligne à 0
  const revised = !!existing.clientId && existing.status === "sent" && content(existing) !== content(q);
  const saved: Quote = { ...q, id, number: existing.number, date: existing.date, terms: existing.terms, clientId: existing.clientId ?? null, request: existing.request ?? null, progress: existing.progress ?? 0, rev: (existing.rev ?? 0) + (revised ? 1 : 0), status };
  const db = await getDb();
  try {
    await db.transaction(async (tx) => {
      const done = await tx.update(schema.quotes).set({ status: saved.status, data: saved }).where(and(eq(schema.quotes.id, id), eq(schema.quotes.userId, userId), unchanged(existing.status, existing.rev ?? 0))).returning({ id: schema.quotes.id });
      if (!done.length) throw new StaleQuote(); // le client a répondu (ou une autre révision est passée) entre la lecture et l'écriture
      if (revised && existing.clientId) {
        await tx.insert(schema.quoteEvents).values({ quoteId: id, actorId: userId, kind: "revised", message: "", data: { rev: saved.rev } });
        await notify(tx, { userId: existing.clientId, quoteId: id, kind: "revised" });
      }
    });
  } catch (e) {
    if (e instanceof StaleQuote) return "locked";
    throw e;
  }
  return saved;
}

// Catalogue des fournisseurs propre à un devis (prix, longueurs, couleurs disponibles). Absent : le devis suit le catalogue général du menuisier.
// Accessible quel que soit le statut du devis : ce sont des prix d'achat internes, jamais montrés au client.
export async function getQuoteCatalog(userId: string, quoteId: string): Promise<Market | null> {
  const db = await getDb();
  const [row] = await db.select({ data: schema.quoteCatalogs.data }).from(schema.quoteCatalogs).where(and(eq(schema.quoteCatalogs.quoteId, quoteId), eq(schema.quoteCatalogs.userId, userId)));
  return row ? withDefaults({ market: row.data }).market : null;
}

export async function saveQuoteCatalog(userId: string, quoteId: string, market: Market): Promise<boolean> {
  if (!(await getQuote(userId, quoteId))) return false;
  const db = await getDb();
  await db.insert(schema.quoteCatalogs).values({ quoteId, userId, data: market }).onConflictDoUpdate({ target: schema.quoteCatalogs.quoteId, set: { data: market, updatedAt: new Date() } });
  return true;
}

export async function deleteQuoteCatalog(userId: string, quoteId: string) {
  const db = await getDb();
  await db.delete(schema.quoteCatalogs).where(and(eq(schema.quoteCatalogs.quoteId, quoteId), eq(schema.quoteCatalogs.userId, userId)));
}

// « locked » : un devis déjà entre les mains d'un client (envoyé, négocié, accepté, terminé) ne se supprime pas : il a un historique et peut avoir une évaluation.
export async function deleteQuote(userId: string, id: string): Promise<boolean | "locked"> {
  const existing = await getQuote(userId, id);
  if (!existing) return false;
  if (existing.clientId && !["requested", "draft", "rejected"].includes(existing.status)) return "locked";
  const db = await getDb();
  const r = await db.delete(schema.quotes).where(and(eq(schema.quotes.id, id), eq(schema.quotes.userId, userId))).returning({ id: schema.quotes.id });
  return r.length > 0;
}

// email facultatif (chaîne vide = aucun) ; le téléphone est normalisé (+261…) et unique. `verified` : compte déjà vérifié (démo, admin).
export async function createUser(email: string, name: string, passwordHash: string, role: Role = "client", phone = "", opts: { verified?: boolean } = {}) {
  const db = await getDb();
  const [u] = await db
    .insert(schema.users)
    .values({ email: email.trim().toLowerCase() || null, name, passwordHash, role, phone: phone.trim(), phoneNorm: normalizePhone(phone), ...(opts.verified ? { phoneVerifiedAt: new Date() } : {}) })
    .onConflictDoNothing()
    .returning({ id: schema.users.id });
  if (u && role === "menuisier") await db.insert(schema.settings).values({ userId: u.id }).onConflictDoNothing();
  return u?.id ?? null; // null : e-mail ou téléphone déjà utilisé
}

export async function setPasswordHash(userId: string, passwordHash: string) {
  const db = await getDb();
  await db.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, userId));
}

export async function findUserById(id: string) {
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  return u ?? null;
}

export async function findUserByPhone(phone: string) {
  const norm = normalizePhone(phone);
  if (!norm) return null;
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.phoneNorm, norm));
  return u ?? null;
}

// Identifiant de connexion : une adresse e-mail (contient @) ou un numéro de téléphone.
export const findUserByIdentifier = (id: string) => (id.includes("@") ? findUserByEmail(id.trim()) : findUserByPhone(id));

export async function findUserByEmail(email: string) {
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase()));
  return u ?? null;
}
