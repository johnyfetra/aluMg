import { afterEach, beforeAll, describe, expect, it } from "vitest";

process.env.PGLITE_DIR = "memory://";
const { getDb, schema } = await import("./db");
const repo = await import("./repo");
const billing = await import("./billing");
const receipts = await import("./receipts");
const { hashPassword } = await import("./password");
const { eq } = await import("drizzle-orm");

let joiner: { id: string; name: string; phone: string };
let other: { id: string; name: string; phone: string };
const admin = { id: "00000000-0000-4000-8000-000000000000", name: "Équipe" };

beforeAll(async () => {
  const h = await hashPassword("secret-pass");
  joiner = { id: (await repo.createUser("", "Atelier Vola", h, "menuisier", "034 11 222 33"))!, name: "Atelier Vola", phone: "034 11 222 33" };
  other = { id: (await repo.createUser("", "Atelier Autre", h, "menuisier", "034 11 222 44"))!, name: "Atelier Autre", phone: "034 11 222 44" };
  const db = await getDb();
  await db.insert(schema.users).values({ id: admin.id, name: admin.name, passwordHash: h, role: "admin" });
});
afterEach(() => {
  delete process.env.BILLING;
});

const declare = (ref: string, months = 1, who = joiner) => billing.declarePayment(who, billing.declareSchema.parse({ operator: "mvola", reference: ref, months }));
const paidUntil = async (id: string) => (await (await getDb()).select({ p: schema.users.paidUntil }).from(schema.users).where(eq(schema.users.id, id)))[0].p;

describe("déclaration d'un paiement", () => {
  it("normalise le code et refuse un code déjà déclaré, même écrit autrement", async () => {
    expect(await declare("ab 12 cd 34")).toEqual({ ok: true });
    expect(await declare("AB12CD34", 1, other)).toEqual({ error: "duplicate" });
    expect(billing.declareSchema.safeParse({ operator: "mvola", reference: "ab", months: 1 }).success).toBe(false);
    expect(billing.declareSchema.safeParse({ operator: "mvola", reference: "ABCD1234", months: 2 }).success).toBe(false);
  });
  it("limite les paiements en attente", async () => {
    await declare("LIM0001", 1, other);
    await declare("LIM0002", 1, other);
    await declare("LIM0003", 1, other);
    expect(await declare("LIM0004", 1, other)).toEqual({ error: "too_many" });
  });
});

describe("vérification par l'équipe", () => {
  it("confirmer prolonge l'abonnement une seule fois, depuis la fin de la période en cours", async () => {
    const { items } = await billing.listPayments({ status: "pending" });
    const p = items.find((x) => x.reference === "AB12CD34")!;
    expect(p.amount).toBe(billing.monthlyPrice());
    expect(await billing.reviewPayment(admin, p.id, "confirm")).toEqual({ ok: true });
    expect(await billing.reviewPayment(admin, p.id, "confirm")).toEqual({ error: "already" });
    const first = (await paidUntil(joiner.id))!;
    expect(first.getTime() - Date.now()).toBeGreaterThan(27 * 864e5);

    await declare("SECOND01", 3);
    const second = (await billing.listPayments({ status: "pending" })).items.find((x) => x.reference === "SECOND01")!;
    await billing.reviewPayment(admin, second.id, "confirm");
    const after = (await paidUntil(joiner.id))!;
    expect(after.getTime() - first.getTime()).toBeGreaterThan(88 * 864e5); // 3 mois ajoutés à la fin de la période, pas à aujourd'hui
  });
  it("refuser garde le motif et ne prolonge rien", async () => {
    const p = (await billing.listPayments({ status: "pending" })).items.find((x) => x.reference === "LIM0001")!;
    await billing.reviewPayment(admin, p.id, "reject", "Aucun transfert reçu");
    expect(await paidUntil(other.id)).toBeNull();
    const mine = await billing.subscriptionOf(other.id);
    expect(mine.payments.find((x) => x.reference === "LIM0001")).toMatchObject({ status: "rejected", note: "Aucun transfert reçu" });
  });
});

describe("accès", () => {
  const old = { createdAt: new Date(Date.now() - 400 * 864e5), paidUntil: null };
  it("tout est ouvert tant que l'abonnement est désactivé", () => {
    expect(billing.accessFrom(old).active).toBe(true);
  });
  it("une fois activé : essai, abonnement en cours, sinon bloqué", () => {
    process.env.BILLING = "on";
    expect(billing.accessFrom(old).active).toBe(false);
    expect(billing.accessFrom({ createdAt: new Date(), paidUntil: null }).active).toBe(true);
    expect(billing.accessFrom({ ...old, paidUntil: new Date(Date.now() + 864e5) }).active).toBe(true);
  });
});

describe("encaissements d'un devis", () => {
  it("bornés au menuisier propriétaire du devis", async () => {
    const q = await repo.createQuote(joiner.id, {
      id: crypto.randomUUID(), number: "", date: new Date().toISOString(), status: "draft",
      client: { name: "Hery", phone: "", address: "", email: "" }, project: "", delay: "", notes: "",
      lines: [{ id: "l1", category: "fenetre", opening: "coulissant", width: 1200, height: 1000, qty: 1, unit: 100000 } as never],
      discount: 0, progress: 0, rev: 0, terms: { tva: 0, deposit: 50, validityDays: 30 },
    });
    const r = { amount: 50000, method: "mvola" as const, reference: "X1", paidOn: "2026-11-24", note: "" };
    expect(await receipts.addReceipt(other.id, q.id, r)).toBeNull();
    const list = (await receipts.addReceipt(joiner.id, q.id, r))!;
    expect(list).toHaveLength(1);
    expect(await receipts.deleteReceipt(other.id, q.id, list[0].id)).toBeNull();
    expect(await receipts.deleteReceipt(joiner.id, q.id, list[0].id)).toEqual([]);
  });
});

describe("validation des saisies", () => {
  it("refuse une date d'encaissement impossible et un numéro de payeur illisible", async () => {
    const { receiptSchema } = await import("./model");
    expect(receiptSchema.safeParse({ amount: 1000, method: "especes", paidOn: "2026-13-45" }).success).toBe(false);
    expect(receiptSchema.safeParse({ amount: 1000, method: "especes", paidOn: "2026-11-24" }).success).toBe(true);
    expect(billing.declareSchema.safeParse({ operator: "mvola", reference: "ABCD1234", months: 1, payerPhone: "abc" }).success).toBe(false);
    expect(billing.declareSchema.safeParse({ operator: "mvola", reference: "ABCD1234", months: 1, payerPhone: "034 12 345 67" }).success).toBe(true);
  });
});
