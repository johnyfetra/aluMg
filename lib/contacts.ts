import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "./db";

// Carnet de clients : toujours borné au menuisier (userId). Le compte client est retrouvé par l'e-mail, jamais choisi par l'appelant.
export const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).default(""),
  email: z.union([z.literal(""), z.email().max(160)]).default(""),
  note: z.string().trim().max(500).default(""),
});
export type ContactInput = z.infer<typeof contactSchema>;
export type ContactView = { id: string; name: string; phone: string; email: string; note: string; account: { id: string; name: string; avatar: string } | null; quotes: number; at: string };

const norm = (e: string) => e.trim().toLowerCase();

async function accountByEmail(email: string) {
  if (!email) return null;
  const db = await getDb();
  const [u] = await db.select({ id: schema.users.id, name: schema.users.name, avatar: schema.users.avatar }).from(schema.users).where(and(eq(schema.users.email, norm(email)), eq(schema.users.role, "client")));
  return u ?? null;
}

export async function listContacts(userId: string): Promise<ContactView[]> {
  const db = await getDb();
  const rows = await db
    .select({ c: schema.contacts, aName: schema.users.name, aAvatar: schema.users.avatar, quotes: sql<number>`(select count(*)::int from ${schema.quotes} q where q.user_id = ${userId} and (q.client_id = ${schema.contacts.clientUserId} or lower(q.data->'client'->>'email') = lower(${schema.contacts.email}) and ${schema.contacts.email} <> ''))` })
    .from(schema.contacts)
    .leftJoin(schema.users, eq(schema.users.id, schema.contacts.clientUserId))
    .where(eq(schema.contacts.userId, userId))
    .orderBy(asc(schema.contacts.name));
  return rows.map(({ c, aName, aAvatar, quotes }) => ({
    id: c.id, name: c.name, phone: c.phone, email: c.email, note: c.note, quotes: Number(quotes), at: c.createdAt.toISOString(),
    account: c.clientUserId ? { id: c.clientUserId, name: aName ?? "", avatar: aAvatar ?? "" } : null,
  }));
}

// Crée un contact, ou met à jour celui qui a déjà cet e-mail (pas de doublon). `clientUserId` suit l'e-mail.
export async function saveContact(userId: string, input: ContactInput, id?: string): Promise<{ id: string } | null> {
  const db = await getDb();
  const email = norm(input.email);
  const acc = await accountByEmail(email);
  const values = { name: input.name, phone: input.phone, email, note: input.note, clientUserId: acc?.id ?? null };
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
