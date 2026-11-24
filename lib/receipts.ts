import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { Receipt, ReceiptInput } from "./model";

// Encaissements d'un devis : toujours bornés au menuisier propriétaire du devis (un devis d'un autre compte répond « introuvable »).

const owns = async (userId: string, quoteId: string) => {
  const db = await getDb();
  const [q] = await db.select({ id: schema.quotes.id }).from(schema.quotes).where(and(eq(schema.quotes.id, quoteId), eq(schema.quotes.userId, userId)));
  return !!q;
};

const cols = { id: schema.quoteReceipts.id, amount: schema.quoteReceipts.amount, method: schema.quoteReceipts.method, reference: schema.quoteReceipts.reference, paidOn: schema.quoteReceipts.paidOn, note: schema.quoteReceipts.note };

export async function listReceipts(userId: string, quoteId: string): Promise<Receipt[] | null> {
  if (!(await owns(userId, quoteId))) return null;
  const db = await getDb();
  return db.select(cols).from(schema.quoteReceipts).where(eq(schema.quoteReceipts.quoteId, quoteId)).orderBy(asc(schema.quoteReceipts.paidOn), asc(schema.quoteReceipts.createdAt));
}

export async function addReceipt(userId: string, quoteId: string, r: ReceiptInput): Promise<Receipt[] | null> {
  if (!(await owns(userId, quoteId))) return null;
  const db = await getDb();
  await db.insert(schema.quoteReceipts).values({ ...r, quoteId, userId });
  return listReceipts(userId, quoteId);
}

export async function deleteReceipt(userId: string, quoteId: string, id: string): Promise<Receipt[] | null> {
  const db = await getDb();
  const t = schema.quoteReceipts;
  await db.delete(t).where(and(eq(t.id, id), eq(t.quoteId, quoteId), eq(t.userId, userId)));
  return listReceipts(userId, quoteId);
}

