import { beforeAll, describe, expect, it } from "vitest";
import { type Quote, lineSchema, quoteSchema, withDefaults } from "./model";

process.env.PGLITE_DIR = "memory://";
const repo = await import("./repo");
const { hashPassword, verifyPassword } = await import("./auth");

const line = lineSchema.parse({
  id: "x", category: "fenetre", opening: "coulissant", leaves: 2, shutter: "roulant", control: "manuel", guard: "barreaudage", range: "asiatique",
  finish: "blanc", infill: "vitree", glassType: "clair", thickness: "5", pattern: "none", extras: [], width: 1200, height: 1000, qty: 1, unit: 540000,
});
const quote = (id: string): Quote =>
  quoteSchema.parse({
    id, number: "client-chosen", date: "2000-01-01T00:00:00.000Z", status: "draft",
    client: { name: "Rakoto", phone: "", address: "" }, project: "", delay: "", notes: "",
    lines: [line], terms: { tva: 20, deposit: 50, validityDays: 30 },
  });
const Q = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let a: string, b: string;

beforeAll(async () => {
  a = (await repo.createUser("A@Example.com", "Alice", await hashPassword("secret-pass"), "menuisier", "034 00 000 00"))!;
  b = (await repo.createUser("b@example.com", "Bob", await hashPassword("other-pass"), "menuisier", "034 00 000 01"))!;
});

describe("comptes", () => {
  it("refuse un e-mail déjà pris (sans tenir compte de la casse)", async () => {
    expect(await repo.createUser("a@example.com", "Autre", "h")).toBeNull();
  });
  it("retrouve l'utilisateur par e-mail et vérifie le mot de passe", async () => {
    const u = await repo.findUserByEmail("a@EXAMPLE.com");
    expect(u?.name).toBe("Alice");
    expect(await verifyPassword("secret-pass", u!.passwordHash)).toBe(true);
    expect(await verifyPassword("wrong", u!.passwordHash)).toBe(false);
  });
  it("ne stocke jamais le mot de passe en clair", async () => {
    expect((await repo.findUserByEmail("a@example.com"))!.passwordHash).not.toContain("secret-pass");
  });
});

describe("devis", () => {
  it("attribue les numéros côté serveur, dans l'ordre, ignorant celui du client", async () => {
    const q1 = await repo.createQuote(a, quote(Q(1)));
    const q2 = await repo.createQuote(a, quote(Q(2)));
    const year = new Date().getFullYear();
    expect(q1.number).toBe(`DV-${year}-0001`);
    expect(q2.number).toBe(`DV-${year}-0002`);
    expect(q1.date).not.toBe("2000-01-01T00:00:00.000Z");
  });
  it("numérote chaque compte séparément", async () => {
    expect((await repo.createQuote(b, quote(Q(3)))).number).toMatch(/-0001$/);
  });
  it("isole les comptes : lecture, modification et suppression croisées impossibles", async () => {
    expect(await repo.getQuote(b, Q(1))).toBeNull();
    expect(await repo.updateQuote(b, Q(1), quote(Q(1)))).toBeNull();
    expect(await repo.deleteQuote(b, Q(1))).toBe(false);
    expect((await repo.listQuotes(b)).map((q) => q.id)).toEqual([Q(3)]);
    expect(await repo.getQuote(a, Q(1))).not.toBeNull();
  });
  it("la mise à jour conserve numéro, date et conditions d'émission", async () => {
    const before = (await repo.getQuote(a, Q(1)))!;
    const saved = await repo.updateQuote(a, Q(1), { ...quote(Q(1)), status: "accepted", terms: { tva: 0, deposit: 0, validityDays: 1 } });
    expect(saved).toMatchObject({ number: before.number, date: before.date, status: "accepted", terms: before.terms });
  });
  it("supprime un devis et ne réutilise pas son numéro", async () => {
    expect(await repo.deleteQuote(a, Q(2))).toBe(true);
    expect((await repo.createQuote(a, quote(Q(4)))).number).toMatch(/-0003$/);
  });
});

describe("réglages", () => {
  it("renvoie les valeurs par défaut puis les réglages enregistrés", async () => {
    expect((await repo.getSettings(a)).tva).toBe(20);
    await repo.saveSettings(a, withDefaults({ company: "Alu Mada", tva: 0 }));
    const s = await repo.getSettings(a);
    expect(s.company).toBe("Alu Mada");
    expect((await repo.getSettings(b)).company).toBe("");
  });
});
