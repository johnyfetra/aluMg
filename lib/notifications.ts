import { and, count, desc, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "./db";

// Notifications du devis (voir schema.notifications). `notify` accepte la transaction en cours pour rester atomique avec l'événement.
type Db = Pick<Awaited<ReturnType<typeof getDb>>, "insert">;
export type NotifyInput = { userId: string; quoteId: string; kind: string; message?: string; lineId?: string | null };

export async function notify(db: Db, n: NotifyInput) {
  await db.insert(schema.notifications).values({ userId: n.userId, quoteId: n.quoteId, kind: n.kind, message: (n.message ?? "").slice(0, 300), lineId: n.lineId ?? null });
}

export type NotificationView = { id: string; quoteId: string; number: string; project: string; lineId: string | null; kind: string; message: string; read: boolean; at: string };

export async function listNotifications(userId: string): Promise<{ items: NotificationView[]; unread: number }> {
  const db = await getDb();
  const rows = await db
    .select({ n: schema.notifications, number: schema.quotes.number, data: schema.quotes.data })
    .from(schema.notifications)
    .innerJoin(schema.quotes, eq(schema.quotes.id, schema.notifications.quoteId))
    .where(eq(schema.notifications.userId, userId))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(40);
  const items = rows.map(({ n, number, data }) => ({ id: n.id, quoteId: n.quoteId, number, project: data.project, lineId: n.lineId, kind: n.kind, message: n.message, read: !!n.readAt, at: n.createdAt.toISOString() }));
  const [{ n }] = await db.select({ n: count() }).from(schema.notifications).where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt)));
  return { items, unread: n }; // compté en base : juste même au-delà des 40 dernières
}

// Sans id : tout marquer lu. Toujours borné à l'utilisateur.
export async function markNotificationsRead(userId: string, id?: string) {
  const db = await getDb();
  const own = and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt));
  await db.update(schema.notifications).set({ readAt: new Date() }).where(id ? and(own, eq(schema.notifications.id, id)) : own);
}
