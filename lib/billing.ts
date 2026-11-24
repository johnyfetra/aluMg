import { and, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { type Actor, audit, MAX_PAGE, PAGE_SIZE } from "./admin";
import { getDb, schema } from "./db";
import { PAY_MONTHS, PAY_OPERATORS, type PayStatus } from "./model";
import { formatPhone, isPhone, normalizePhone } from "./phone";
import { isUniqueViolation } from "./phones";
import { sendSms } from "./senders";
import { mailTeam } from "./team";

// Abonnement des menuisiers, sans API d'opérateur : le menuisier envoie l'argent par mobile money, déclare le code de transfert reçu par SMS,
// l'équipe vérifie la réception sur son téléphone puis confirme dans l'administration, ce qui prolonge l'abonnement.
// Tant que BILLING n'est pas « on », l'application reste gratuite : rien n'est bloqué, la page d'abonnement l'annonce.
// shortcut: prix et période d'essai réglés par variables d'environnement, passer à une table de formules quand il y en aura plusieurs.

export const billingOn = () => process.env.BILLING === "on";
export const monthlyPrice = () => Number(process.env.BILLING_MONTHLY_AR) || 50_000;
const trialDays = () => Number(process.env.BILLING_TRIAL_DAYS ?? 30);
// Numéros qui reçoivent les paiements, affichés au menuisier (ex. « MVola 034 00 000 00 · Orange Money 032 00 000 00 »).
const payTo = () => (process.env.PAY_TO ?? "").trim();

export const declareSchema = z.object({
  operator: z.enum(PAY_OPERATORS),
  // le code tel qu'il figure dans le SMS de l'opérateur ; espaces retirés, majuscules : un même code ne se déclare pas deux fois sous deux écritures
  reference: z.string().transform((s) => s.replace(/\s+/g, "").toUpperCase()).pipe(z.string().regex(/^[A-Z0-9.\-_/]{4,40}$/)),
  payerPhone: z.string().trim().max(30).refine((s) => !s || isPhone(s)).default(""),
  months: z.number().int().refine((m) => (PAY_MONTHS as readonly number[]).includes(m)),
});
export type DeclareInput = z.infer<typeof declareSchema>;
export const reviewSchema = z.object({ decision: z.enum(["confirm", "reject"]), note: z.string().trim().max(200).default("") });

const MAX_PENDING = 3; // au-delà, le menuisier attend la vérification des précédents

// Accès aux fonctions payantes : toujours vrai quand l'abonnement est désactivé ; sinon période d'essai depuis l'inscription, ou abonnement en cours.
export function accessFrom(u: { paidUntil: Date | null; createdAt: Date }, now = new Date()) {
  const trialUntil = new Date(u.createdAt.getTime() + trialDays() * 864e5);
  const active = !billingOn() || (u.paidUntil !== null && u.paidUntil > now) || trialUntil > now;
  return { active, trialUntil };
}

export async function hasAccess(userId: string) {
  const db = await getDb();
  const [u] = await db.select({ paidUntil: schema.users.paidUntil, createdAt: schema.users.createdAt }).from(schema.users).where(eq(schema.users.id, userId));
  return !!u && accessFrom(u).active;
}

export async function subscriptionOf(userId: string) {
  const db = await getDb();
  const t = schema.subscriptionPayments;
  const [[u], payments] = await Promise.all([
    db.select({ paidUntil: schema.users.paidUntil, createdAt: schema.users.createdAt }).from(schema.users).where(eq(schema.users.id, userId)),
    db.select({ id: t.id, operator: t.operator, reference: t.reference, amount: t.amount, months: t.months, status: t.status, note: t.note, createdAt: t.createdAt }).from(t).where(eq(t.userId, userId)).orderBy(desc(t.createdAt)).limit(20),
  ]);
  const { active, trialUntil } = accessFrom(u);
  return { on: billingOn(), active, paid: u.paidUntil !== null && u.paidUntil > new Date(), paidUntil: u.paidUntil, trialUntil, monthly: monthlyPrice(), payTo: payTo(), payments };
}
export type Subscription = Awaited<ReturnType<typeof subscriptionOf>>;

export async function declarePayment(user: { id: string; name: string; phone: string }, input: DeclareInput): Promise<{ ok: true } | { error: "duplicate" | "too_many" }> {
  const db = await getDb();
  const t = schema.subscriptionPayments;
  const [{ n }] = await db.select({ n: count() }).from(t).where(and(eq(t.userId, user.id), eq(t.status, "pending")));
  if (n >= MAX_PENDING) return { error: "too_many" };
  const amount = input.months * monthlyPrice();
  try {
    await db.insert(t).values({ userId: user.id, operator: input.operator, reference: input.reference, payerPhone: input.payerPhone, amount, months: input.months });
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "duplicate" };
    throw e;
  }
  const payer = normalizePhone(input.payerPhone) ?? input.payerPhone; // affiché tel quel s'il n'est pas reconnu
  void mailTeam(`Paiement AluMg à vérifier : ${user.name}`, [
    `${user.name} (${formatPhone(normalizePhone(user.phone) ?? user.phone)}) déclare un paiement d'abonnement.`,
    ``,
    `Opérateur : ${input.operator}`,
    `Code de transfert : ${input.reference}`,
    payer ? `Numéro qui a payé : ${formatPhone(payer)}` : null,
    `Montant attendu : ${amount} Ar pour ${input.months} mois`,
    ``,
    `Vérifiez la réception, puis confirmez dans l'administration : /admin/paiements`,
  ]).catch((e) => console.error("[alumg] avis de paiement non envoyé", e)); // l'e-mail ne bloque jamais la déclaration
  return { ok: true };
}

const clampPage = (page = 1) => Math.min(Math.max(1, Math.trunc(page) || 1), MAX_PAGE);

// Les plus récents d'abord ; `news` = paiements en attente de vérification.
export async function listPayments(f: { status?: PayStatus; page?: number } = {}) {
  const db = await getDb();
  const t = schema.subscriptionPayments;
  const where = f.status ? eq(t.status, f.status) : undefined;
  const page = clampPage(f.page);
  const [[{ total }], [{ news }], items] = await Promise.all([
    db.select({ total: count() }).from(t).where(where),
    db.select({ news: count() }).from(t).where(eq(t.status, "pending")),
    db
      .select({ id: t.id, userId: t.userId, name: schema.users.name, phone: schema.users.phone, paidUntil: schema.users.paidUntil, operator: t.operator, reference: t.reference, payerPhone: t.payerPhone, amount: t.amount, months: t.months, status: t.status, note: t.note, createdAt: t.createdAt, reviewedAt: t.reviewedAt })
      .from(t)
      .innerJoin(schema.users, eq(schema.users.id, t.userId))
      .where(where)
      .orderBy(desc(t.createdAt), desc(t.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
  ]);
  return { items, total, news, page, pageSize: PAGE_SIZE };
}
export type PaymentRow = Awaited<ReturnType<typeof listPayments>>["items"][number];

// Une seule décision par paiement : la mise à jour ne vise que les paiements encore en attente (deux administrateurs ne prolongent pas deux fois).
// Confirmer prolonge depuis la fin de l'abonnement en cours, ou depuis aujourd'hui s'il est échu.
export async function reviewPayment(actor: Actor, id: string, decision: "confirm" | "reject", note = ""): Promise<{ ok: true } | { error: "not_found" | "already" }> {
  const db = await getDb();
  const t = schema.subscriptionPayments;
  const r = await db.transaction(async (tx) => {
    const [p] = await tx.update(t).set({ status: decision === "confirm" ? "confirmed" : "rejected", note, reviewedAt: new Date() }).where(and(eq(t.id, id), eq(t.status, "pending"))).returning();
    if (!p) {
      const [exists] = await tx.select({ id: t.id }).from(t).where(eq(t.id, id));
      return { error: exists ? "already" : "not_found" } as const;
    }
    const [u] =
      decision === "confirm"
        ? await tx
            .update(schema.users)
            .set({ paidUntil: sql`greatest(coalesce(${schema.users.paidUntil}, now()), now()) + make_interval(months => ${p.months})` })
            .where(eq(schema.users.id, p.userId))
            .returning({ name: schema.users.name, phone: schema.users.phone, paidUntil: schema.users.paidUntil })
        : await tx.select({ name: schema.users.name, phone: schema.users.phone, paidUntil: schema.users.paidUntil }).from(schema.users).where(eq(schema.users.id, p.userId));
    await audit(tx, actor, decision === "confirm" ? "payment_confirm" : "payment_reject", { id: p.userId, label: u.name }, { reference: p.reference, operator: p.operator, amount: p.amount, months: p.months, note });
    return { ok: true, payment: p, user: u } as const;
  });
  if ("error" in r) return r;
  const phone = normalizePhone(r.user.phone);
  if (phone) {
    const until = r.user.paidUntil?.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Indian/Antananarivo" });
    const text = decision === "confirm" ? `AluMg : paiement ${r.payment.reference} reçu, merci ! Votre abonnement est actif jusqu'au ${until}.` : `AluMg : nous n'avons pas trouvé le paiement ${r.payment.reference}.${note ? ` ${note}` : ""} Vérifiez le code dans l'application ou écrivez-nous.`;
    void sendSms(phone, text).catch((e) => console.error("[alumg] SMS d'abonnement non envoyé", e));
  }
  return { ok: true };
}

