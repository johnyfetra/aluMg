import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { MAX_PAGE, PAGE_SIZE } from "./admin";
import type { SessionUser } from "./auth";
import { getDb, schema } from "./db";
import { FEEDBACK_KINDS, FEEDBACK_MESSAGE_MAX, FEEDBACK_MESSAGE_MIN, FEEDBACK_STATUSES, type FeedbackKind, type FeedbackStatus } from "./model";

// Retours des utilisateurs (problème, idée, remarque) : écrits par n'importe quel compte connecté, lus et traités par l'administration.

export const feedbackSchema = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  message: z.string().trim().min(FEEDBACK_MESSAGE_MIN).max(FEEDBACK_MESSAGE_MAX),
  page: z.string().max(200).regex(/^(\/[^\s?#]*)?$/).default(""), // chemin de l'écran seulement, jamais de paramètres ni de coordonnées
});
export type FeedbackInput = z.infer<typeof feedbackSchema>;

export async function createFeedback(user: Pick<SessionUser, "id" | "name" | "role">, input: FeedbackInput) {
  const db = await getDb();
  await db.insert(schema.feedback).values({ userId: user.id, authorName: user.name, authorRole: user.role, ...input });
}

export type FeedbackFilter = { kind?: FeedbackKind; status?: FeedbackStatus; page?: number };
const clampPage = (page = 1) => Math.min(Math.max(1, Math.trunc(page) || 1), MAX_PAGE);

// Les plus récents d'abord ; `news` = retours pas encore vus, pour le signaler dans l'administration.
export async function listFeedback(f: FeedbackFilter = {}) {
  const db = await getDb();
  const t = schema.feedback;
  const where = and(f.kind ? eq(t.kind, f.kind) : undefined, f.status ? eq(t.status, f.status) : undefined);
  const page = clampPage(f.page);
  const [[{ total }], [{ news }], items] = await Promise.all([
    db.select({ total: count() }).from(t).where(where),
    db.select({ news: count() }).from(t).where(eq(t.status, "new")),
    db
      .select({ id: t.id, userId: t.userId, authorName: t.authorName, authorRole: t.authorRole, kind: t.kind, message: t.message, page: t.page, status: t.status, createdAt: t.createdAt })
      .from(t)
      .where(where)
      .orderBy(desc(t.createdAt), desc(t.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
  ]);
  return { items, total, news, page, pageSize: PAGE_SIZE };
}
export type FeedbackRow = Awaited<ReturnType<typeof listFeedback>>["items"][number];

export async function setFeedbackStatus(id: string, status: FeedbackStatus) {
  const db = await getDb();
  const r = await db.update(schema.feedback).set({ status }).where(eq(schema.feedback.id, id)).returning({ id: schema.feedback.id });
  return r.length > 0;
}

export const statusSchema = z.object({ status: z.enum(FEEDBACK_STATUSES) });
