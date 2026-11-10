import { count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { MAX_PAGE, PAGE_SIZE } from "./admin";
import { getDb, schema } from "./db";
import { formatPhone, isPhone, normalizePhone } from "./phone";
import { mailTeam } from "./team";

// Bulle de discussion du site public : un visiteur laisse nom, numéro et message ; l'équipe le lit dans l'administration et rappelle.

export const siteMessageSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(40).refine(isPhone),
  message: z.string().trim().min(2).max(2000),
  page: z.string().max(200).regex(/^(\/[^\s?#]*)?$/).default(""), // chemin seulement, jamais de paramètres
});
export type SiteMessageInput = z.infer<typeof siteMessageSchema>;
export const SITE_STATUSES = ["new", "done"] as const;

// Le numéro appartient-il à un compte ? (numéro principal ou numéro ajouté) : on en tire le rôle affiché à l'équipe.
async function accountFor(phone: string) {
  const db = await getDb();
  const u = schema.users;
  const [main] = await db.select({ id: u.id, role: u.role }).from(u).where(eq(u.phoneNorm, phone)).limit(1);
  if (main) return main;
  const [extra] = await db.select({ id: u.id, role: u.role }).from(schema.userPhones).innerJoin(u, eq(u.id, schema.userPhones.userId)).where(eq(schema.userPhones.phoneNorm, phone)).limit(1);
  return extra ?? null;
}

export async function createSiteMessage(input: SiteMessageInput) {
  const phone = normalizePhone(input.phone)!; // validé par le schéma
  const account = await accountFor(phone);
  const role = account?.role ?? "visitor";
  const db = await getDb();
  await db.insert(schema.siteMessages).values({ ...input, phone, userId: account?.id ?? null, role });
  const who = { visitor: "Visiteur", client: "Client", menuisier: "Menuisier", admin: "Administrateur" }[role];
  void mailTeam(`Message du site : ${input.name} (${who})`, [`Nom : ${input.name}`, `Téléphone : ${formatPhone(phone)}`, `Profil : ${who}${account ? " (compte AluMg)" : ""}`, input.page ? `Page : ${input.page}` : null, ``, input.message, ``, `À traiter dans l'administration : /admin/messages-site`]).catch((e) => console.error("[alumg] avis de message non envoyé", e));
}

export async function listSiteMessages(f: { status?: (typeof SITE_STATUSES)[number]; page?: number } = {}) {
  const db = await getDb();
  const t = schema.siteMessages;
  const page = Math.min(Math.max(1, Math.trunc(f.page ?? 1) || 1), MAX_PAGE);
  const where = f.status ? eq(t.status, f.status) : undefined;
  const [[{ total }], [{ news }], items] = await Promise.all([
    db.select({ total: count() }).from(t).where(where),
    db.select({ news: count() }).from(t).where(eq(t.status, "new")),
    db.select().from(t).where(where).orderBy(desc(t.createdAt), desc(t.id)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
  ]);
  return { items, total, news, page, pageSize: PAGE_SIZE };
}
export type SiteMessageRow = Awaited<ReturnType<typeof listSiteMessages>>["items"][number];

export async function setSiteMessageStatus(id: string, status: (typeof SITE_STATUSES)[number]) {
  const db = await getDb();
  const r = await db.update(schema.siteMessages).set({ status }).where(eq(schema.siteMessages.id, id)).returning({ id: schema.siteMessages.id });
  return r.length > 0;
}
export const siteStatusSchema = z.object({ status: z.enum(SITE_STATUSES) });
