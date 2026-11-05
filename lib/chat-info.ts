import { and, desc, eq, ilike, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { EPHEMERAL } from "./attach";
import { access, chatId, prefsOf, type MessageView } from "./chat";
import { getDb, schema } from "./db";
import { imageSrc } from "./logo";

// Fiche de la conversation (panneau « Infos du contact ») : médias, documents, liens, messages importants et réglages de celui qui la consulte.
export const prefsSchema = z.object({ favorite: z.boolean(), muted: z.boolean(), blocked: z.boolean() }).partial();
export const actionSchema = z.union([
  z.object({ action: z.enum(["clear", "delete"]) }),
  z.object({ action: z.literal("ephemeral"), seconds: z.union(EPHEMERAL.map((s) => z.literal(s)) as [z.ZodLiteral<0>, z.ZodLiteral<86400>, z.ZodLiteral<604800>, z.ZodLiteral<7776000>]) }),
  z.object({ action: z.literal("report"), reason: z.enum(["spam", "abuse", "scam", "other"]) }),
  z.object({ action: z.literal("star"), messageId: z.uuid(), on: z.boolean() }),
]);
export type InfoMedia = { id: string; name: string; mime: string; size: number; at: string };
export type ConversationInfo = { since: string; quotes: number; media: InfoMedia[]; links: { url: string; at: string }[]; starred: Pick<MessageView, "id" | "body" | "at" | "mine">[] };

const URL_RE = /https?:\/\/[^\s<>"']+/gi;

export async function conversationInfo(who: string, id: string): Promise<ConversationInfo | null> {
  const a = await access(who, id);
  if (!a) return null;
  const userId = await chatId(who);
  const db = await getDb();
  const { clearedAt } = await prefsOf(id, userId);
  const live = and(eq(schema.messages.conversationId, id), sql`(${schema.messages.expiresAt} is null or ${schema.messages.expiresAt} > now())`, clearedAt ? sql`${schema.messages.createdAt} > ${clearedAt}` : undefined);
  const files = await db
    .select({ id: schema.messageAttachments.id, name: schema.messageAttachments.name, mime: schema.messageAttachments.mime, size: schema.messageAttachments.size, at: schema.messages.createdAt })
    .from(schema.messageAttachments)
    .innerJoin(schema.messages, eq(schema.messages.id, schema.messageAttachments.messageId))
    .where(and(live, sql`${schema.messageAttachments.mime} not like 'audio/%'`))
    .orderBy(desc(schema.messages.createdAt))
    .limit(200);
  const texts = await db.select({ body: schema.messages.body, at: schema.messages.createdAt }).from(schema.messages).where(and(live, sql`${schema.messages.body} ~* 'https?://'`)).orderBy(desc(schema.messages.createdAt)).limit(100);
  const starred = await db
    .select({ id: schema.messages.id, body: schema.messages.body, at: schema.messages.createdAt, senderId: schema.messages.senderId })
    .from(schema.messageStars)
    .innerJoin(schema.messages, eq(schema.messages.id, schema.messageStars.messageId))
    .where(and(eq(schema.messageStars.userId, userId), live))
    .orderBy(desc(schema.messages.createdAt));
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.quotes).where(and(eq(schema.quotes.userId, a.c.menuisierId), eq(schema.quotes.clientId, a.c.clientId)));
  return {
    since: a.c.createdAt.toISOString(),
    quotes: n,
    media: files.map((f) => ({ ...f, at: f.at.toISOString() })),
    links: texts.flatMap((m) => (m.body.match(URL_RE) ?? []).map((url) => ({ url: url.replace(/[).,;!?]+$/, ""), at: m.at.toISOString() }))).slice(0, 100),
    starred: starred.map((m) => ({ id: m.id, body: m.body, at: m.at.toISOString(), mine: m.senderId === userId })),
  };
}

async function setPrefs(userId: string, id: string, patch: Partial<typeof schema.conversationPrefs.$inferInsert>) {
  const db = await getDb();
  await db.insert(schema.conversationPrefs).values({ conversationId: id, userId, ...patch }).onConflictDoUpdate({ target: [schema.conversationPrefs.conversationId, schema.conversationPrefs.userId], set: patch });
}

export type ActionResult = { ok: true } | { ok: false; error: "not_found" | "forbidden" };

export async function updatePrefs(who: string, id: string, patch: z.infer<typeof prefsSchema>): Promise<ActionResult> {
  const a = await access(who, id);
  if (!a) return { ok: false, error: "not_found" };
  const userId = await chatId(who);
  if (patch.blocked !== undefined && (await otherIsAdmin(a.c, userId))) return { ok: false, error: "forbidden" }; // on ne bloque pas la plateforme
  if (Object.keys(patch).length) await setPrefs(userId, id, patch);
  return { ok: true };
}

const otherIsAdmin = async (c: { clientId: string; menuisierId: string }, userId: string) => {
  const db = await getDb();
  const [u] = await db.select({ role: schema.users.role }).from(schema.users).where(eq(schema.users.id, c.clientId === userId ? c.menuisierId : c.clientId));
  return u?.role === "admin";
};

export async function runAction(who: string, id: string, input: z.infer<typeof actionSchema>): Promise<ActionResult> {
  const a = await access(who, id);
  if (!a) return { ok: false, error: "not_found" };
  const userId = await chatId(who);
  const db = await getDb();
  switch (input.action) {
    case "clear":
      await setPrefs(userId, id, { clearedAt: new Date(), hidden: false });
      break;
    case "delete":
      await setPrefs(userId, id, { clearedAt: new Date(), hidden: true });
      break;
    case "ephemeral":
      await db.update(schema.conversations).set({ ephemeralSec: input.seconds }).where(eq(schema.conversations.id, id));
      break;
    case "report":
      if (await otherIsAdmin(a.c, userId)) return { ok: false, error: "forbidden" };
      await db.insert(schema.conversationReports).values({ conversationId: id, reporterId: userId, reason: input.reason });
      break;
    case "star": {
      const [m] = await db.select({ id: schema.messages.id }).from(schema.messages).where(and(eq(schema.messages.id, input.messageId), eq(schema.messages.conversationId, id)));
      if (!m) return { ok: false, error: "not_found" };
      if (input.on) await db.insert(schema.messageStars).values({ messageId: m.id, userId }).onConflictDoNothing();
      else await db.delete(schema.messageStars).where(and(eq(schema.messageStars.messageId, m.id), eq(schema.messageStars.userId, userId)));
    }
  }
  return { ok: true };
}

// ---------- Nouvelle discussion : chercher parmi les personnes à qui l'on a le droit d'écrire (mêmes règles que startConversation) ----------
export type Person = { name: string; role: "client" | "menuisier"; avatar: string; target: { menuisier: string } | { client: string } | { user: string } };
const like = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export async function searchPeople(user: { id: string; role: "client" | "menuisier" | "admin" }, q: string): Promise<Person[]> {
  const db = await getDb();
  if (user.role === "client") {
    const rows = await db.select({ slug: schema.menuisierProfiles.slug, name: schema.menuisierProfiles.displayName, logo: schema.menuisierProfiles.logo }).from(schema.menuisierProfiles).where(and(eq(schema.menuisierProfiles.published, true), ilike(schema.menuisierProfiles.displayName, like(q)))).orderBy(schema.menuisierProfiles.displayName).limit(20);
    return rows.map((r) => ({ name: r.name, role: "menuisier", avatar: imageSrc(r.slug, "logo", r.logo), target: { menuisier: r.slug } }));
  }
  if (user.role === "menuisier") {
    const mine = db.select({ id: schema.quotes.clientId }).from(schema.quotes).where(and(eq(schema.quotes.userId, user.id), sql`${schema.quotes.clientId} is not null`));
    const rows = await db.select({ id: schema.users.id, name: schema.users.name, avatar: schema.users.avatar }).from(schema.users).where(and(inArray(schema.users.id, mine), ilike(schema.users.name, like(q)))).orderBy(schema.users.name).limit(20);
    return rows.map((r) => ({ name: r.name, role: "client", avatar: r.avatar, target: { client: r.id } }));
  }
  const rows = await db.select({ id: schema.users.id, name: schema.users.name, avatar: schema.users.avatar, role: schema.users.role }).from(schema.users).where(and(ne(schema.users.role, "admin"), ilike(schema.users.name, like(q)))).orderBy(schema.users.name).limit(20);
  return rows.map((r) => ({ name: r.name, role: r.role === "menuisier" ? "menuisier" : "client", avatar: r.avatar, target: { user: r.id } }));
}
