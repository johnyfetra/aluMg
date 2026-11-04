import { and, asc, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "./db";
import { maskEmail, maskPhone, normalizePhone } from "./phone";
import { phoneOwner } from "./phones";

// Carnet de clients : toujours borné au menuisier (userId). Le compte client est retrouvé par l'e-mail, jamais choisi par l'appelant.
export const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).default(""),
  email: z.union([z.literal(""), z.email().max(160)]).default(""),
  note: z.string().trim().max(500).default(""),
  discount: z.number().int().min(0).max(100).default(0), // remise habituelle en %
});
export type ContactInput = z.infer<typeof contactSchema>;
export type ContactView = { id: string; name: string; phone: string; email: string; note: string; discount: number; account: { id: string; name: string; avatar: string } | null; quotes: number; at: string };

const norm = (e: string) => e.trim().toLowerCase();

// Compte client correspondant à un contact : par e-mail, sinon par numéro de téléphone normalisé.
export async function clientAccountFor({ email, phone }: { email?: string; phone?: string }) {
  const db = await getDb();
  const pick = { id: schema.users.id, name: schema.users.name, avatar: schema.users.avatar };
  if (email) {
    const [u] = await db.select(pick).from(schema.users).where(and(eq(schema.users.email, norm(email)), eq(schema.users.role, "client")));
    if (u) return u;
  }
  const pn = phone ? normalizePhone(phone) : null;
  if (!pn) return null;
  const owner = await phoneOwner(pn);
  if (!owner) return null;
  const [u] = await db.select(pick).from(schema.users).where(and(eq(schema.users.id, owner), eq(schema.users.role, "client")));
  return u ?? null;
}

// Compte client actif choisi dans l'annuaire : un identifiant qui ne désigne pas un client (menuisier, administrateur, compte suspendu) n'est jamais accepté.
export async function clientAccountById(id: string) {
  const db = await getDb();
  const [u] = await db.select({ id: schema.users.id, name: schema.users.name, avatar: schema.users.avatar }).from(schema.users).where(and(eq(schema.users.id, id), eq(schema.users.role, "client"), isNull(schema.users.suspendedAt)));
  return u ?? null;
}

// Annuaire des clients de la plateforme, pour un menuisier qui prépare un devis. Recherche par nom seulement (jamais par e-mail ou téléphone : pas de moyen de
// deviner les coordonnées d'un client), coordonnées masquées dans les résultats, comptes vérifiés et actifs seulement, 8 par page.
export const CLIENTS_PAGE = 8;
export const MAX_CLIENT_PAGE = 50;
export type ClientHit = { id: string; name: string; avatar: string; hint: string };
export async function searchClients(f: { q?: string; page?: number }): Promise<{ items: ClientHit[]; total: number; page: number; pageSize: number }> {
  const db = await getDb();
  const u = schema.users;
  const term = (f.q ?? "").trim().toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`);
  const page = Math.min(Math.max(1, Math.trunc(f.page ?? 1) || 1), MAX_CLIENT_PAGE);
  const where = and(eq(u.role, "client"), isNull(u.suspendedAt), or(isNotNull(u.phoneVerifiedAt), isNotNull(u.emailVerifiedAt)), term ? sql`lower(${u.name}) like ${`%${term}%`}` : undefined);
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(u).where(where);
  const rows = await db.select({ id: u.id, name: u.name, avatar: u.avatar, email: u.email, phoneNorm: u.phoneNorm }).from(u).where(where).orderBy(asc(u.name), asc(u.id)).limit(CLIENTS_PAGE).offset((page - 1) * CLIENTS_PAGE);
  return { items: rows.map((r) => ({ id: r.id, name: r.name, avatar: r.avatar, hint: r.email ? maskEmail(r.email) : r.phoneNorm ? maskPhone(r.phoneNorm) : "" })), total, page, pageSize: CLIENTS_PAGE };
}

export async function listContacts(userId: string): Promise<ContactView[]> {
  const db = await getDb();
  const rows = await db
    .select({ c: schema.contacts, aName: schema.users.name, aAvatar: schema.users.avatar, quotes: sql<number>`(select count(*)::int from ${schema.quotes} q where q.user_id = ${userId} and (q.client_id = ${schema.contacts.clientUserId} or lower(q.data->'client'->>'email') = lower(${schema.contacts.email}) and ${schema.contacts.email} <> ''))` })
    .from(schema.contacts)
    .leftJoin(schema.users, eq(schema.users.id, schema.contacts.clientUserId))
    .where(eq(schema.contacts.userId, userId))
    .orderBy(asc(schema.contacts.name));
  // Vie privée : le nom et la photo du compte ne sont révélés qu'une fois une relation établie (devis échangé) ; avant, seul le fait qu'il existe l'est.
  return rows.map(({ c, aName, aAvatar, quotes }) => ({
    id: c.id, name: c.name, phone: c.phone, email: c.email, note: c.note, discount: c.discount, quotes: Number(quotes), at: c.createdAt.toISOString(),
    account: c.clientUserId ? (Number(quotes) > 0 ? { id: c.clientUserId, name: aName ?? "", avatar: aAvatar ?? "" } : { id: "", name: "", avatar: "" }) : null,
  }));
}

// Crée un contact, ou met à jour celui qui a déjà cet e-mail (pas de doublon). `clientUserId` suit l'e-mail.
export async function saveContact(userId: string, input: ContactInput, id?: string): Promise<{ id: string } | null> {
  const db = await getDb();
  const email = norm(input.email);
  const acc = await clientAccountFor({ email, phone: input.phone });
  const values = { name: input.name, phone: input.phone, email, note: input.note, discount: input.discount, clientUserId: acc?.id ?? null };
  if (id) {
    const [u] = await db.update(schema.contacts).set(values).where(and(eq(schema.contacts.id, id), eq(schema.contacts.userId, userId))).returning({ id: schema.contacts.id });
    return u ?? null;
  }
  if (email) {
    const [same] = await db.select({ id: schema.contacts.id }).from(schema.contacts).where(and(eq(schema.contacts.userId, userId), eq(schema.contacts.email, email)));
    if (same) {
      await db.update(schema.contacts).set(values).where(eq(schema.contacts.id, same.id));
      return same;
    }
  }
  const [c] = await db.insert(schema.contacts).values({ userId, ...values }).returning({ id: schema.contacts.id });
  return c;
}

export async function deleteContact(userId: string, id: string) {
  const db = await getDb();
  const done = await db.delete(schema.contacts).where(and(eq(schema.contacts.id, id), eq(schema.contacts.userId, userId))).returning({ id: schema.contacts.id });
  return done.length > 0;
}

// Ajout automatique quand un client entre en relation (demande de devis, envoi d'un devis) : ne touche pas à un contact existant saisi à la main.
export async function ensureContact(userId: string, c: { name: string; phone: string; email: string; clientUserId?: string | null }) {
  const db = await getDb();
  const email = norm(c.email);
  const existing = c.clientUserId
    ? (await db.select({ id: schema.contacts.id }).from(schema.contacts).where(and(eq(schema.contacts.userId, userId), eq(schema.contacts.clientUserId, c.clientUserId))))[0]
    : email
      ? (await db.select({ id: schema.contacts.id }).from(schema.contacts).where(and(eq(schema.contacts.userId, userId), eq(schema.contacts.email, email))))[0]
      : undefined;
  if (existing) {
    if (c.clientUserId) await db.update(schema.contacts).set({ clientUserId: c.clientUserId }).where(eq(schema.contacts.id, existing.id));
    return existing.id;
  }
  const [row] = await db.insert(schema.contacts).values({ userId, name: c.name.slice(0, 120) || email, phone: c.phone.slice(0, 40), email, clientUserId: c.clientUserId ?? null }).returning({ id: schema.contacts.id });
  return row.id;
}

// Remise habituelle d'un client (en %) : celle de son contact chez ce menuisier, 0 s'il n'en a pas.
export async function discountFor(userId: string, c: { clientUserId?: string | null; email?: string }) {
  const db = await getDb();
  const email = norm(c.email ?? "");
  const where = c.clientUserId ? eq(schema.contacts.clientUserId, c.clientUserId) : email ? eq(schema.contacts.email, email) : null;
  if (!where) return 0;
  const [row] = await db.select({ discount: schema.contacts.discount }).from(schema.contacts).where(and(eq(schema.contacts.userId, userId), where));
  return row?.discount ?? 0;
}
