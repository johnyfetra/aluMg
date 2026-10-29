/**
 * Étale dans le temps les devis et conversations créés par scripts/seed-quotes.mts (tout est daté « maintenant » à la création) :
 * date de création du devis, horodatage de chaque événement, notifications (lues si anciennes), avis et messages.
 * Écrit directement dans la base locale : ARRÊTEZ le serveur avant (`npm run seed:local` s'en charge).
 *   npx tsx scripts/backdate-demo.mts
 */
import { readFileSync } from "node:fs";
import { asc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "../lib/db";

if (process.env.DATABASE_URL || process.env.POSTGRES_URL) throw new Error("backdate-demo ne touche qu'à la base locale : videz DATABASE_URL et POSTGRES_URL.");
const { quotes, convs } = JSON.parse(readFileSync(".data/seed-dates.json", "utf8")) as { quotes: { id: string; age: number; last: number }[]; convs: { id: string; age: number; last: number; unread: boolean }[] };
async function main() {
  const db = await getDb();
  const now = Date.now();
  const DAY = 864e5;
  const at = (daysAgo: number) => new Date(now - daysAgo * DAY);
  // durée d'attente après chaque type d'événement (poids relatif) : un devis part vite, la réponse du client et le chantier prennent du temps
  const WAIT: Record<string, number> = { created: 0.4, sent: 3, change_requested: 1.5, revised: 1, line_comment: 0.5, accepted: 2, progress: 4, completed: 0.3, declined: 1, message: 0.5 };
  // positions (en jours avant maintenant) de n repères répartis entre `age` et `last`, selon le poids de l'attente qui suit chacun
  function spread(kinds: string[], age: number, last: number) {
    if (kinds.length === 1) return [age];
    const gaps = kinds.slice(0, -1).map((k) => WAIT[k] ?? 1);
    const total = gaps.reduce((a, b) => a + b, 0);
    let acc = 0;
    return kinds.map((_, i) => {
      const d = age - ((age - last) * acc) / total;
      acc += gaps[i] ?? 0;
      return d;
    });
  }

  for (const q of quotes) {
    const events = await db.select().from(schema.quoteEvents).where(eq(schema.quoteEvents.quoteId, q.id)).orderBy(asc(schema.quoteEvents.createdAt));
    const days = spread(events.map((e) => e.kind), q.age, q.last);
    for (const [i, e] of events.entries()) await db.update(schema.quoteEvents).set({ createdAt: at(days[i]) }).where(eq(schema.quoteEvents.id, e.id));
    const created = at(q.age).toISOString();
    await db.update(schema.quotes).set({ createdAt: at(q.age), data: sql`jsonb_set(${schema.quotes.data}, '{date}', to_jsonb(${created}::text))` }).where(eq(schema.quotes.id, q.id));
    const notes = await db.select().from(schema.notifications).where(eq(schema.notifications.quoteId, q.id)).orderBy(asc(schema.notifications.createdAt));
    for (const [j, n] of notes.entries()) {
      const when = at(days[Math.min(events.length - 1, Math.round((j * Math.max(events.length - 1, 0)) / Math.max(notes.length - 1, 1)))] ?? q.last);
      await db.update(schema.notifications).set({ createdAt: when, readAt: when.getTime() < now - 5 * DAY ? new Date(when.getTime() + 2 * 36e5) : null }).where(eq(schema.notifications.id, n.id));
    }
    await db.update(schema.reviews).set({ createdAt: at(q.last) }).where(eq(schema.reviews.quoteId, q.id));
  }

  for (const c of convs) {
    const msgs = await db.select().from(schema.messages).where(eq(schema.messages.conversationId, c.id)).orderBy(asc(schema.messages.createdAt));
    const days = spread(msgs.map(() => "message"), c.age, c.last);
    for (const [i, m] of msgs.entries()) await db.update(schema.messages).set({ createdAt: at(days[i]) }).where(eq(schema.messages.id, m.id));
    const lastAt = at(c.last);
    // « non lu » : le menuisier n'a pas ouvert la conversation depuis l'avant-dernier message du client
    await db.update(schema.conversations).set({ createdAt: at(c.age), lastMessageAt: lastAt, clientReadAt: lastAt, menuisierReadAt: c.unread ? at(c.last + 1) : lastAt }).where(eq(schema.conversations.id, c.id));
  }
  console.log(`dates étalées : ${quotes.length} devis, ${convs.length} conversations`);
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
