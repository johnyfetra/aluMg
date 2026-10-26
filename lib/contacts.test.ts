import { beforeAll, describe, expect, it } from "vitest";
import { lineSchema, quoteSchema } from "./model";

process.env.PGLITE_DIR = "memory://";
const repo = await import("./repo");
const ct = await import("./contacts");
const wf = await import("./workflow");
const pf = await import("./profiles");
const notif = await import("./notifications");

let m1: string, m2: string, c1: string, slug1: string;
const line = lineSchema.parse({ id: "x", category: "fenetre", opening: "coulissant", leaves: 2, shutter: "roulant", control: "manuel", guard: "barreaudage", range: "asiatique", finish: "blanc", infill: "vitree", glassType: "clair", thickness: "5", pattern: "none", extras: [], width: 1200, height: 1000, qty: 1, unit: 100000 });

beforeAll(async () => {
  m1 = (await repo.createUser("m1@ex.mg", "Rabe Alu", "h", "menuisier", "034 11 111 11"))!;
  m2 = (await repo.createUser("m2@ex.mg", "Autre", "h", "menuisier", "034 22 222 22"))!;
  c1 = (await repo.createUser("hery@ex.mg", "Hery Rakoto", "h", "client", "033 33 333 33"))!;
  slug1 = (await pf.getOwnProfile(m1, "Rabe Alu")).slug; // profil non publié : le lien de demande suffit
});

describe("carnet de clients", () => {
  it("un contact retrouve le compte client par l'e-mail (sans tenir compte de la casse)", async () => {
    const r = await ct.saveContact(m1, { name: "Hery", phone: "033 33 333 33", email: "HERY@ex.mg", note: "" });
    const list = await ct.listContacts(m1);
    expect(list).toHaveLength(1);
    // vie privée : tant qu'aucun devis n'a été échangé, on sait seulement qu'un compte existe (ni nom ni photo)
    expect(list[0]).toMatchObject({ id: r!.id, email: "hery@ex.mg", account: { id: "", name: "", avatar: "" } });
  });
  it("même e-mail : mise à jour, pas de doublon ; sans compte : account null", async () => {
    await ct.saveContact(m1, { name: "Hery R.", phone: "", email: "hery@ex.mg", note: "VIP" });
    await ct.saveContact(m1, { name: "Walk-in", phone: "032 00 000 00", email: "", note: "" });
    const list = await ct.listContacts(m1);
    expect(list).toHaveLength(2);
    expect(list.find((c) => c.email === "hery@ex.mg")).toMatchObject({ name: "Hery R.", note: "VIP" });
    expect(list.find((c) => c.name === "Walk-in")!.account).toBeNull();
  });
  it("chaque menuisier ne voit et ne modifie que son carnet", async () => {
    expect(await ct.listContacts(m2)).toEqual([]);
    const mine = (await ct.listContacts(m1))[0];
    expect(await ct.saveContact(m2, { name: "pirate", phone: "", email: "", note: "" }, mine.id)).toBeNull();
    expect(await ct.deleteContact(m2, mine.id)).toBe(false);
    expect(await ct.deleteContact(m1, mine.id)).toBe(true);
  });
  it("validation : nom obligatoire, e-mail valide", () => {
    expect(ct.contactSchema.safeParse({ name: "", phone: "", email: "", note: "" }).success).toBe(false);
    expect(ct.contactSchema.safeParse({ name: "A", email: "pas-un-mail" }).success).toBe(false);
    expect(ct.contactSchema.safeParse({ name: "A" }).success).toBe(true);
  });
});

describe("le client entre dans le carnet", () => {
  it("demande de devis par lien (profil non publié) : contact créé, menuisier notifié", async () => {
    const r = await wf.createRequest(c1, { menuisier: slug1, project: "Villa", message: "Bonjour", siteAddress: "", wantedDate: "", lines: [line] });
    expect(typeof r).toBe("object");
    const list = await ct.listContacts(m1);
    expect(list.some((c) => c.account?.id === c1)).toBe(true);
    expect((await notif.listNotifications(m1)).items.some((n) => n.kind === "request")).toBe(true);
  });
  it("envoi d'un devis à un client retrouvé par e-mail : contact lié au compte, sans doublon", async () => {
    const before = (await ct.listContacts(m1)).length;
    const q = await repo.createQuote(m1, quoteSchema.parse({ id: crypto.randomUUID(), number: "", date: "", status: "draft", client: { name: "Hery", phone: "", address: "", email: "hery@ex.mg" }, project: "P2", delay: "", notes: "", lines: [line], terms: { tva: 0, deposit: 0, validityDays: 30 } }));
    expect((await wf.applyAction(m1, q.id, { type: "send" })).ok).toBe(true);
    expect((await ct.listContacts(m1)).length).toBe(before);
  });
  it("un contact compte ses devis", async () => {
    expect((await ct.listContacts(m1)).find((c) => c.account?.id === c1)!.quotes).toBeGreaterThanOrEqual(2);
  });
});
