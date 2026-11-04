import { count, eq, sql } from "drizzle-orm";
import { getDb, schema } from "./db";

// Téléchargements du PDF d'un devis. Seuls comptent ceux du menuisier qui l'a établi et du client à qui il a été envoyé : jamais celui d'un tiers ni de l'administration.
const t = schema.quoteDownloads;

export async function recordDownload(userId: string, quoteId: string): Promise<{ ok: true } | { error: "not_found" }> {
  const db = await getDb();
  const [q] = await db.select({ owner: schema.quotes.userId, client: schema.quotes.clientId, status: schema.quotes.status }).from(schema.quotes).where(eq(schema.quotes.id, quoteId));
  if (!q) return { error: "not_found" };
  // le client ne voit un devis qu'une fois envoyé : avant, il n'a rien à télécharger
  const role = q.owner === userId ? "menuisier" : q.client === userId && !["requested", "draft"].includes(q.status) ? "client" : null;
  if (!role) return { error: "not_found" };
  await db.insert(t).values({ quoteId, userId, role });
  return { ok: true };
}

export type DownloadStats = { total: number; menuisier: number; client: number; last: Date | null };
export async function downloadStats(quoteId: string): Promise<DownloadStats> {
  const db = await getDb();
  const [r] = await db
    .select({ total: count(), menuisier: sql<number>`count(*) filter (where ${t.role} = 'menuisier')::int`, client: sql<number>`count(*) filter (where ${t.role} = 'client')::int`, last: sql<Date | null>`max(${t.createdAt})`.mapWith(t.createdAt) })
    .from(t)
    .where(eq(t.quoteId, quoteId));
  return { total: r.total, menuisier: r.menuisier, client: r.client, last: r.last };
}
