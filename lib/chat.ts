import { imageSrc } from "./logo";
import { and, asc, desc, eq, gt, inArray, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { ATTACH, ATTACH_MIME, isAudioMime, isImageMime } from "./attach";
import { getDb, schema } from "./db";
import { totals } from "./totals";

// ---------- Règles de la messagerie ----------
// Un client écrit à un menuisier dont le profil est publié ; un menuisier n'écrit qu'à un client qui lui a demandé un devis
// (pas de démarchage à l'aveugle). Une fois la conversation créée, chacun peut y répondre.
const bytesOf = (b64: string) => Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);
const cleanName = (n: string) => n.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim().slice(0, 120) || "fichier";

export const messageSchema = z
  .object({
    body: z.string().trim().max(2000).default(""),
    replyToId: z.uuid().optional(),
    quoteId: z.uuid().optional(),
    files: z.array(z.object({ name: z.string().min(1).max(200), mime: z.string().max(120), data: z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/), durationMs: z.number().int().min(0).max(300_000).optional() })).max(ATTACH.maxFiles).default([]),
  })
  .refine((m) => m.body.length > 0 || m.files.length > 0 || !!m.quoteId, { message: "empty" });
export type MessageInput = z.infer<typeof messageSchema>;
// menuisier : profil public (annuaire) ; menuisierId : le menuisier d'un de mes devis (sans profil publié) ; client : un client qui a reçu ou demandé un de mes devis.
export const startSchema = z.union([z.object({ menuisier: z.string().min(1).max(80) }), z.object({ menuisierId: z.uuid() }), z.object({ client: z.uuid() })]);

export { ATTACH, isAudioMime, isImageMime };
export type Role = "client" | "menuisier" | "admin";
export type Other = { id: string; name: string; avatar: string; role: "client" | "menuisier"; slug: string; logo: string };
export type ConversationView = {
  id: string;
  other: Other;
  last: { body: string; at: string; mine: boolean; files: number; quote: boolean; receipt: Receipt | null } | null;
  unread: number;
  updatedAt: string;
};
export type AttachmentView = { id: string; name: string; mime: string; size: number; durationMs: number | null };
// Devis cité dans un message : de quoi l'identifier et l'ouvrir (le lien dépend du rôle de celui qui lit). Le montant n'est donné qu'une fois le devis envoyé.
export type QuoteRef = { id: string; number: string; project: string; status: string; total: number | null; href: string };
// Accusés d'un message qu'on a envoyé : envoyé (en base), reçu (l'appareil de l'autre l'a téléchargé), lu (l'autre a ouvert la discussion).
export type Receipt = "sent" | "delivered" | "read";
export type MessageView = {
  id: string;
  body: string;
  at: string;
  mine: boolean;
  receipt: Receipt | null; // seulement pour mes messages
  replyTo: { id: string; body: string; mine: boolean; files: number } | null;
  attachments: AttachmentView[];
  quote: QuoteRef | null;
};

export type StartResult = { ok: true; id: string } | { ok: false; error: "not_found" | "forbidden" };

export async function startConversation(user: { id: string; role: Role }, target: z.infer<typeof startSchema>): Promise<StartResult> {
  const db = await getDb();
  let clientId: string;
  let menuisierId: string;
  if ("menuisierId" in target) {
    if (user.role !== "client") return { ok: false, error: "forbidden" };
    const [q] = await db.select({ id: schema.quotes.id }).from(schema.quotes).where(and(eq(schema.quotes.userId, target.menuisierId), eq(schema.quotes.clientId, user.id))).limit(1);
    if (!q) return { ok: false, error: "forbidden" };
    [clientId, menuisierId] = [user.id, target.menuisierId];
  } else if ("menuisier" in target) {
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

// Recevoir la liste, c'est avoir reçu les messages : l'accusé de réception de l'expéditeur passe à ✓✓.
async function markDelivered(userId: string) {
  const db = await getDb();
  const now = new Date();
  await db.update(schema.conversations).set({ clientDeliveredAt: now }).where(eq(schema.conversations.clientId, userId));
  await db.update(schema.conversations).set({ menuisierDeliveredAt: now }).where(eq(schema.conversations.menuisierId, userId));
}

// Accusé d'un message que j'ai envoyé, d'après ce que l'autre a reçu et lu.
const receiptOf = (c: { clientReadAt: Date; menuisierReadAt: Date; clientDeliveredAt: Date; menuisierDeliveredAt: Date }, side: "client" | "menuisier", at: Date): Receipt => {
  const read = side === "client" ? c.menuisierReadAt : c.clientReadAt;
  const delivered = side === "client" ? c.menuisierDeliveredAt : c.clientDeliveredAt;
  return at <= read ? "read" : at <= delivered ? "delivered" : "sent";
};

export async function listConversations(userId: string): Promise<ConversationView[]> {
  const db = await getDb();
  await markDelivered(userId);
  const rows = await db.select().from(schema.conversations).where(or(eq(schema.conversations.clientId, userId), eq(schema.conversations.menuisierId, userId))).orderBy(desc(schema.conversations.lastMessageAt));
  return Promise.all(
    rows.map(async (c) => {
      const side = c.clientId === userId ? "client" : "menuisier";
      const otherId = side === "client" ? c.menuisierId : c.clientId;
      const readAt = side === "client" ? c.clientReadAt : c.menuisierReadAt;
      const [u] = await db.select({ name: schema.users.name, avatar: schema.users.avatar }).from(schema.users).where(eq(schema.users.id, otherId));
      const [p] = await db.select({ slug: schema.menuisierProfiles.slug, name: schema.menuisierProfiles.displayName, logo: schema.menuisierProfiles.logo }).from(schema.menuisierProfiles).where(eq(schema.menuisierProfiles.userId, otherId));
      const [last] = await db.select().from(schema.messages).where(eq(schema.messages.conversationId, c.id)).orderBy(desc(schema.messages.createdAt)).limit(1);
      const [{ files }] = last ? await db.select({ files: sql<number>`count(*)::int` }).from(schema.messageAttachments).where(eq(schema.messageAttachments.messageId, last.id)) : [{ files: 0 }];
      const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.messages).where(and(eq(schema.messages.conversationId, c.id), ne(schema.messages.senderId, userId), gt(schema.messages.createdAt, readAt)));
      return {
        id: c.id,
        other: { id: otherId, name: side === "client" ? (p?.name || u?.name || "") : (u?.name ?? ""), avatar: u?.avatar ?? "", role: side === "client" ? "menuisier" : "client", slug: side === "client" ? (p?.slug ?? "") : "", logo: side === "client" ? imageSrc(p?.slug ?? "", "logo", p?.logo ?? "") : "" },
        last: last ? { body: last.body, at: last.createdAt.toISOString(), mine: last.senderId === userId, files, quote: !!last.quoteId, receipt: last.senderId === userId ? receiptOf(c, side, last.createdAt) : null } : null,
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
  const now = new Date();
  await db.update(schema.conversations).set(a.side === "client" ? { clientReadAt: now, clientDeliveredAt: now } : { menuisierReadAt: now, menuisierDeliveredAt: now }).where(eq(schema.conversations.id, id));
  return present(userId, a.side, rows, a.c);
}

type Row = typeof schema.messages.$inferSelect;

// Complète des messages : pièces jointes (sans leur contenu), message cité, devis cité.
async function present(userId: string, side: "client" | "menuisier", rows: Row[], conv: Parameters<typeof receiptOf>[0]): Promise<MessageView[]> {
  if (!rows.length) return [];
  const db = await getDb();
  const ids = rows.map((m) => m.id);
  const files = await db.select({ id: schema.messageAttachments.id, messageId: schema.messageAttachments.messageId, name: schema.messageAttachments.name, mime: schema.messageAttachments.mime, size: schema.messageAttachments.size, durationMs: schema.messageAttachments.durationMs }).from(schema.messageAttachments).where(inArray(schema.messageAttachments.messageId, ids));
  const replyIds = [...new Set(rows.flatMap((m) => (m.replyToId ? [m.replyToId] : [])))];
  const replies = replyIds.length ? await db.select().from(schema.messages).where(inArray(schema.messages.id, replyIds)) : [];
  const replyFiles = replyIds.length ? await db.select({ messageId: schema.messageAttachments.messageId }).from(schema.messageAttachments).where(inArray(schema.messageAttachments.messageId, replyIds)) : [];
  const quoteIds = [...new Set(rows.flatMap((m) => (m.quoteId ? [m.quoteId] : [])))];
  const quotes = quoteIds.length ? await db.select({ id: schema.quotes.id, data: schema.quotes.data, status: schema.quotes.status }).from(schema.quotes).where(inArray(schema.quotes.id, quoteIds)) : [];
  return rows.map((m) => {
    const r = replies.find((x) => x.id === m.replyToId);
    const q = quotes.find((x) => x.id === m.quoteId);
    return {
      id: m.id,
      body: m.body,
      at: m.createdAt.toISOString(),
      mine: m.senderId === userId,
      receipt: m.senderId === userId ? receiptOf(conv, side, m.createdAt) : null,
      replyTo: r ? { id: r.id, body: r.body.slice(0, 140), mine: r.senderId === userId, files: replyFiles.filter((f) => f.messageId === r.id).length } : null,
      attachments: files.filter((f) => f.messageId === m.id).map(({ id, name, mime, size, durationMs }) => ({ id, name, mime, size, durationMs })),
      quote: q ? { id: q.id, number: q.data.number, project: q.data.project, status: q.status, total: ["draft", "requested"].includes(q.status) ? null : totals(q.data).ttc, href: side === "menuisier" ? `/devis/${q.id}` : `/espace-client/devis/${q.id}` } : null,
    };
  });
}

export type SendResult = { ok: true; message: MessageView } | { ok: false; error: "not_found" | "bad_reply" | "bad_quote" | "bad_file" | "too_big" };

// Devis qu'on peut citer dans cette conversation : ceux du menuisier pour ce client, une fois sortis du brouillon.
export async function citableQuotes(userId: string, id: string) {
  const a = await access(userId, id);
  if (!a) return null;
  const db = await getDb();
  const rows = await db.select({ id: schema.quotes.id, status: schema.quotes.status, data: schema.quotes.data }).from(schema.quotes).where(and(eq(schema.quotes.userId, a.c.menuisierId), eq(schema.quotes.clientId, a.c.clientId), ne(schema.quotes.status, "draft"))).orderBy(desc(schema.quotes.createdAt));
  return rows.map((q) => ({ id: q.id, number: q.data.number, project: q.data.project, status: q.status }));
}

export async function sendMessage(userId: string, id: string, input: MessageInput): Promise<SendResult> {
  const a = await access(userId, id);
  if (!a) return { ok: false, error: "not_found" };
  const db = await getDb();
  if (input.replyToId) {
    const [r] = await db.select({ id: schema.messages.id }).from(schema.messages).where(and(eq(schema.messages.id, input.replyToId), eq(schema.messages.conversationId, id)));
    if (!r) return { ok: false, error: "bad_reply" };
  }
  if (input.quoteId && !(await citableQuotes(userId, id))?.some((q) => q.id === input.quoteId)) return { ok: false, error: "bad_quote" };
  let total = 0;
  const files = input.files.map((f) => {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    const size = bytesOf(f.data);
    total += size;
    return { ok: ATTACH_MIME[f.mime]?.includes(ext) && size > 0 && size <= ATTACH.maxFile, name: cleanName(f.name), mime: f.mime, size, data: f.data, durationMs: isAudioMime(f.mime) ? (f.durationMs ?? null) : null };
  });
  if (files.some((f) => !f.ok)) return { ok: false, error: files.some((f) => f.size > ATTACH.maxFile) ? "too_big" : "bad_file" };
  if (total > ATTACH.maxTotal) return { ok: false, error: "too_big" };
  const [m] = await db.insert(schema.messages).values({ conversationId: id, senderId: userId, body: input.body, replyToId: input.replyToId ?? null, quoteId: input.quoteId ?? null }).returning();
  if (files.length) await db.insert(schema.messageAttachments).values(files.map((f) => ({ messageId: m.id, name: f.name, mime: f.mime, size: f.size, durationMs: f.durationMs, data: f.data })));
  await db.delete(schema.conversationTyping).where(and(eq(schema.conversationTyping.conversationId, id), eq(schema.conversationTyping.userId, userId))); // il a fini d'écrire
  // l'expéditeur a, par définition, tout lu
  await db.update(schema.conversations).set({ lastMessageAt: m.createdAt, ...(a.side === "client" ? { clientReadAt: m.createdAt } : { menuisierReadAt: m.createdAt }) }).where(eq(schema.conversations.id, id));
  return { ok: true, message: (await present(userId, a.side, [m], a.c))[0] };
}

// Contenu d'une pièce jointe, seulement pour les deux participants de la conversation.
export async function getAttachment(userId: string, attachmentId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ name: schema.messageAttachments.name, mime: schema.messageAttachments.mime, data: schema.messageAttachments.data, conversationId: schema.messages.conversationId })
    .from(schema.messageAttachments)
    .innerJoin(schema.messages, eq(schema.messages.id, schema.messageAttachments.messageId))
    .where(eq(schema.messageAttachments.id, attachmentId));
  if (!row || !(await access(userId, row.conversationId))) return null;
  return { name: row.name, mime: row.mime, bytes: Buffer.from(row.data, "base64") };
}

// ---------- « L'autre est en train d'écrire » ----------
// Le client signale « j'écris » toutes les ~2,5 s tant qu'il tape ; l'indicateur de l'autre expire après 5 s sans signal.
export const TYPING_TTL_MS = 5000;
export type Typing = "text" | "voice" | null;

export async function setTyping(userId: string, id: string, kind: "text" | "voice"): Promise<boolean> {
  if (!(await access(userId, id))) return false;
  const db = await getDb();
  await db.insert(schema.conversationTyping).values({ conversationId: id, userId, kind }).onConflictDoUpdate({ target: [schema.conversationTyping.conversationId, schema.conversationTyping.userId], set: { kind, at: new Date() } });
  return true;
}

export async function getTyping(userId: string, id: string): Promise<Typing | undefined> {
  if (!(await access(userId, id))) return undefined;
  const db = await getDb();
  const [row] = await db.select({ kind: schema.conversationTyping.kind, at: schema.conversationTyping.at }).from(schema.conversationTyping).where(and(eq(schema.conversationTyping.conversationId, id), ne(schema.conversationTyping.userId, userId)));
  return row && Date.now() - row.at.getTime() < TYPING_TTL_MS ? row.kind : null;
}

export async function unreadCount(userId: string): Promise<number> {
  return (await listConversations(userId)).reduce((s, c) => s + c.unread, 0);
}
