import { and, asc, desc, eq, gt, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "./db";

// ---------- Règles de la messagerie ----------
// Un client écrit à un menuisier dont le profil est publié ; un menuisier n'écrit qu'à un client qui lui a demandé un devis
// (pas de démarchage à l'aveugle). Une fois la conversation créée, chacun peut y répondre.
export const messageSchema = z.object({ body: z.string().trim().min(1).max(2000) });
export const startSchema = z.union([z.object({ menuisier: z.string().min(1).max(80) }), z.object({ client: z.uuid() })]);

export type Role = "client" | "menuisier" | "admin";
export type Other = { id: string; name: string; avatar: string; role: "client" | "menuisier"; slug: string; logo: string };
export type ConversationView = {
  id: string;
  other: Other;
  last: { body: string; at: string; mine: boolean } | null;
  unread: number;
  updatedAt: string;
};
export type MessageView = { id: string; body: string; at: string; mine: boolean };

export type StartResult = { ok: true; id: string } | { ok: false; error: "not_found" | "forbidden" };

export async function startConversation(user: { id: string; role: Role }, target: z.infer<typeof startSchema>): Promise<StartResult> {
  const db = await getDb();
  let clientId: string;
  let menuisierId: string;
  if ("menuisier" in target) {
    if (user.role !== "client") return { ok: false, error: "forbidden" };
    const [p] = await db.select({ userId: schema.menuisierProfiles.userId }).from(schema.menuisierProfiles).where(and(eq(schema.menuisierProfiles.slug, target.menuisier), eq(schema.menuisierProfiles.published, true)));
    if (!p) return { ok: false, error: "not_found" };
    [clientId, menuisierId] = [user.id, p.userId];
  } else {
    if (user.role !== "menuisier") return { ok: false, error: "forbidden" };
    const [q] = await db.select({ id: schema.quotes.id }).from(schema.quotes).where(and(eq(schema.quotes.userId, user.id), eq(schema.quotes.clientId, target.client))).limit(1);
    if (!q) return { ok: false, error: "forbidden" };
    [clientId, menuisierId] = [target.client, user.id];
  }
  const [existing] = await db.select({ id: schema.conversations.id }).from(schema.conversations).where(and(eq(schema.conversations.clientId, clientId), eq(schema.conversations.menuisierId, menuisierId)));
  if (existing) return { ok: true, id: existing.id };
  const [created] = await db.insert(schema.conversations).values({ clientId, menuisierId }).onConflictDoNothing().returning({ id: schema.conversations.id });
  if (created) return { ok: true, id: created.id };
  const [again] = await db.select({ id: schema.conversations.id }).from(schema.conversations).where(and(eq(schema.conversations.clientId, clientId), eq(schema.conversations.menuisierId, menuisierId)));
  return { ok: true, id: again.id };
}

// La conversation, seulement si l'utilisateur en est un participant ; renvoie aussi son côté.
async function access(userId: string, id: string) {
  const db = await getDb();
  const [c] = await db.select().from(schema.conversations).where(and(eq(schema.conversations.id, id), or(eq(schema.conversations.clientId, userId), eq(schema.conversations.menuisierId, userId))));
  return c ? { c, side: (c.clientId === userId ? "client" : "menuisier") as "client" | "menuisier" } : null;
}

export async function listConversations(userId: string): Promise<ConversationView[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.conversations).where(or(eq(schema.conversations.clientId, userId), eq(schema.conversations.menuisierId, userId))).orderBy(desc(schema.conversations.lastMessageAt));
  return Promise.all(
    rows.map(async (c) => {
      const side = c.clientId === userId ? "client" : "menuisier";
      const otherId = side === "client" ? c.menuisierId : c.clientId;
      const readAt = side === "client" ? c.clientReadAt : c.menuisierReadAt;
      const [u] = await db.select({ name: schema.users.name, avatar: schema.users.avatar }).from(schema.users).where(eq(schema.users.id, otherId));
      const [p] = await db.select({ slug: schema.menuisierProfiles.slug, name: schema.menuisierProfiles.displayName, logo: schema.menuisierProfiles.logo }).from(schema.menuisierProfiles).where(eq(schema.menuisierProfiles.userId, otherId));
      const [last] = await db.select().from(schema.messages).where(eq(schema.messages.conversationId, c.id)).orderBy(desc(schema.messages.createdAt)).limit(1);
      const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.messages).where(and(eq(schema.messages.conversationId, c.id), ne(schema.messages.senderId, userId), gt(schema.messages.createdAt, readAt)));
      return {
        id: c.id,
        other: { id: otherId, name: side === "client" ? (p?.name || u?.name || "") : (u?.name ?? ""), avatar: u?.avatar ?? "", role: side === "client" ? "menuisier" : "client", slug: side === "client" ? (p?.slug ?? "") : "", logo: side === "client" ? (p?.logo ?? "") : "" },
        last: last ? { body: last.body, at: last.createdAt.toISOString(), mine: last.senderId === userId } : null,
        unread: n,
        updatedAt: c.lastMessageAt.toISOString(),
      };
    }),
  );
}

// Messages d'une conversation. Les ouvrir les marque comme lus pour l'utilisateur. `after` ne renvoie que les nouveaux (interrogation régulière).
export async function readMessages(userId: string, id: string, after?: string): Promise<MessageView[] | null> {
  const a = await access(userId, id);
  if (!a) return null;
  const db = await getDb();
  const since = after && !Number.isNaN(Date.parse(after)) ? new Date(after) : null;
  const rows = await db.select().from(schema.messages).where(since ? and(eq(schema.messages.conversationId, id), gt(schema.messages.createdAt, since)) : eq(schema.messages.conversationId, id)).orderBy(asc(schema.messages.createdAt)).limit(500);
  await db.update(schema.conversations).set(a.side === "client" ? { clientReadAt: new Date() } : { menuisierReadAt: new Date() }).where(eq(schema.conversations.id, id));
  return rows.map((m) => ({ id: m.id, body: m.body, at: m.createdAt.toISOString(), mine: m.senderId === userId }));
}

export async function sendMessage(userId: string, id: string, body: string): Promise<MessageView | null> {
  const a = await access(userId, id);
  if (!a) return null;
  const db = await getDb();
  const [m] = await db.insert(schema.messages).values({ conversationId: id, senderId: userId, body }).returning();
  // l'expéditeur a, par définition, tout lu
  await db.update(schema.conversations).set({ lastMessageAt: m.createdAt, ...(a.side === "client" ? { clientReadAt: m.createdAt } : { menuisierReadAt: m.createdAt }) }).where(eq(schema.conversations.id, id));
  return { id: m.id, body: m.body, at: m.createdAt.toISOString(), mine: true };
}

export async function unreadCount(userId: string): Promise<number> {
  return (await listConversations(userId)).reduce((s, c) => s + c.unread, 0);
}
