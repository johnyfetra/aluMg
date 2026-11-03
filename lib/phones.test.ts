import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Channel } from "./verify";

process.env.PGLITE_DIR = "memory://";
const repo = await import("./repo");
const ph = await import("./phones");
const v = await import("./verify");
const { setSenderForTests } = await import("./senders");
const { getDb, schema } = await import("./db");
const { eq } = await import("drizzle-orm");

// Expéditeur factice : on lit le code envoyé au numéro à ajouter.
const sent: { channel: Channel; to: string; code: string }[] = [];
const fake = () => ({ channels: () => ["sms", "call", "email"] as Channel[], send: async (channel: Channel, to: string, code: string) => { sent.push({ channel, to, code }); return {}; } });
const lastCode = () => sent[sent.length - 1].code;
const wipeCodes = async (id: string) => (await getDb()).delete(schema.verifications).where(eq(schema.verifications.userId, id));

let alice: string, bob: string;
beforeAll(async () => {
  alice = (await repo.createUser("a@ex.mg", "Alice", "h", "menuisier", "034 11 111 11", { verified: true }))!;
  bob = (await repo.createUser("b@ex.mg", "Bob", "h", "client", "034 22 222 22", { verified: true }))!;
});
afterEach(() => { sent.length = 0; setSenderForTests(null); });

describe("ajout d'un numéro supplémentaire", () => {
  it("n'est rattaché qu'après le code reçu sur ce numéro", async () => {
    setSenderForTests(fake());
    expect((await v.sendPhoneCode(alice, "033 12 000 01")).ok).toBe(true);
    expect(sent[0]).toMatchObject({ channel: "sms", to: "+261331200001" });
    expect((await ph.listPhones(alice)).map((p) => p.primary)).toEqual([true]); // pas encore ajouté
    expect(await v.confirmPhoneCode(alice, "000000")).toMatchObject({ ok: false, error: "wrong_code" });
    expect(await v.confirmPhoneCode(alice, lastCode(), "Bureau")).toEqual({ ok: true });
    const list = await ph.listPhones(alice);
    expect(list.map((p) => [p.phone, p.label, p.primary])).toEqual([["034 11 111 11", "", true], ["+261 33 12 000 01", "Bureau", false]]);
  });
  it("le code d'ajout ne vérifie jamais le compte, ni l'inverse", async () => {
    setSenderForTests(fake());
    const carol = (await repo.createUser("c@ex.mg", "Carol", "h", "client", "034 33 333 33"))!; // non vérifiée
    await v.sendPhoneCode(carol, "033 99 000 02");
    const code = lastCode();
    expect(await v.confirmCode(carol, code)).toMatchObject({ ok: false, error: "no_pending" }); // pas le même type de code
    expect((await repo.findUserById(carol))!.phoneVerifiedAt).toBeNull();
    await wipeCodes(carol); // le délai de 30 s entre deux envois ne doit pas masquer ce que le test vérifie
    await v.sendCode(carol, "sms");
    expect(await v.confirmPhoneCode(carol, lastCode())).toMatchObject({ ok: false, error: "no_pending" });
  });
});

describe("un numéro = un seul compte", () => {
  it("refuse le numéro principal ou supplémentaire d'un autre compte, sous tous les formats", async () => {
    setSenderForTests(fake());
    expect(await v.sendPhoneCode(bob, "+261 34 11 111 11")).toMatchObject({ ok: false, error: "phone_taken" }); // principal d'Alice
    expect(await v.sendPhoneCode(bob, "0331200001")).toMatchObject({ ok: false, error: "phone_taken" }); // supplémentaire d'Alice
    expect(await v.sendPhoneCode(alice, "034 11 111 11")).toMatchObject({ ok: false, error: "phone_taken" }); // le sien : déjà là
    expect(await v.sendPhoneCode(bob, "pas un numéro")).toMatchObject({ ok: false, error: "invalid_phone" });
    expect(sent).toHaveLength(0);
  });
  it("l'inscription refuse un numéro supplémentaire existant", async () => {
    expect(await repo.createUser("x@ex.mg", "Intrus", "h", "client", "+261 33 12 000 01")).toBeNull();
    expect(await repo.createUser("y@ex.mg", "Intrus", "h", "client", "034 11 111 11")).toBeNull();
  });
  it("la connexion par numéro marche avec n'importe quel numéro du compte", async () => {
    expect((await repo.findUserByIdentifier("034 11 111 11"))!.id).toBe(alice);
    expect((await repo.findUserByIdentifier("033 12 000 01"))!.id).toBe(alice);
    expect(await repo.findUserByIdentifier("033 12 000 99")).toBeNull();
  });
  it("la base elle-même refuse le doublon, même sans passer par ce code", async () => {
    const db = await getDb();
    // supplémentaire déjà pris comme principal d'un autre compte
    await expect(db.insert(schema.userPhones).values({ userId: bob, phone: "x", phoneNorm: "+261341111111" })).rejects.toSatisfy(ph.isUniqueViolation);
    // principal déjà pris comme supplémentaire d'un autre compte
    await expect(db.update(schema.users).set({ phoneNorm: "+261331200001" }).where(eq(schema.users.id, bob))).rejects.toSatisfy(ph.isUniqueViolation);
    // deux supplémentaires identiques
    await expect(db.insert(schema.userPhones).values({ userId: bob, phone: "y", phoneNorm: "+261331200001" })).rejects.toSatisfy(ph.isUniqueViolation);
  });
  it("deux ajouts simultanés du même numéro : un seul compte l'obtient", async () => {
    setSenderForTests(fake());
    await wipeCodes(alice); await wipeCodes(bob);
    await v.sendPhoneCode(alice, "032 55 000 03"); const a = lastCode();
    await v.sendPhoneCode(bob, "032 55 000 03"); const b = lastCode();
    const [ra, rb] = await Promise.all([v.confirmPhoneCode(alice, a), v.confirmPhoneCode(bob, b)]);
    expect([ra.ok, rb.ok].filter(Boolean)).toHaveLength(1);
    const loser = ra.ok ? rb : ra;
    expect(loser).toMatchObject({ ok: false, error: "phone_taken" });
  });
});

describe("limites et retrait", () => {
  it("quatre numéros supplémentaires au plus", async () => {
    setSenderForTests(fake());
    const dan = (await repo.createUser("d@ex.mg", "Dan", "h", "client", "034 44 444 44", { verified: true }))!;
    for (const n of ["033 00 000 11", "033 00 000 12", "033 00 000 13", "033 00 000 14"]) {
      await wipeCodes(dan);
      await v.sendPhoneCode(dan, n);
      expect((await v.confirmPhoneCode(dan, lastCode())).ok).toBe(true);
    }
    expect(await v.sendPhoneCode(dan, "033 00 000 15")).toMatchObject({ ok: false, error: "limit" });
    expect(await ph.listPhones(dan)).toHaveLength(5);
  });
  it("on retire un numéro supplémentaire, jamais celui d'un autre compte, jamais le principal", async () => {
    const extra = (await ph.listPhones(alice)).find((p) => !p.primary)!;
    expect(await ph.removePhone(bob, extra.id)).toBe(false); // pas son numéro
    expect(await ph.removePhone(alice, "primary")).toBe(false);
    expect(await ph.removePhone(alice, extra.id)).toBe(true);
    expect((await repo.findUserByIdentifier("033 12 000 01"))).toBeNull();
    // le numéro retiré redevient libre pour un autre compte
    expect(await repo.createUser("z@ex.mg", "Nouveau", "h", "client", "033 12 000 01")).toBeTruthy();
  });
});
