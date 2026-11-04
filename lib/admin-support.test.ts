import { beforeAll, describe, expect, it } from "vitest";
import { lineSchema, type Quote, quoteSchema } from "./model";

process.env.PGLITE_DIR = "memory://";
const repo = await import("./repo");
const chat = await import("./chat");
const dl = await import("./downloads");
const admin = await import("./admin");

const line = lineSchema.parse({ id: "x", category: "fenetre", opening: "coulissant", leaves: 2, shutter: "roulant", control: "manuel", guard: "barreaudage", range: "asiatique", finish: "blanc", infill: "vitree", glassType: "clair", thickness: "5", pattern: "none", extras: [], width: 1200, height: 1000, qty: 1, unit: 100000 });
const quote = (status: Quote["status"] = "sent") => quoteSchema.parse({ id: crypto.randomUUID(), number: "", date: "", status, client: { name: "Hery", phone: "", address: "" }, project: "", delay: "", notes: "", lines: [line], terms: { tva: 20, deposit: 50, validityDays: 30 } });
let m1: string, c1: string, c2: string, boss: string;
const asAdmin = (id: string) => ({ id, role: "admin" as const });

beforeAll(async () => {
  m1 = (await repo.createUser("m1@ex.mg", "Rabe Alu", "h", "menuisier", "034 11 111 11", { verified: true }))!;
  c1 = (await repo.createUser("c1@ex.mg", "Hery Rakoto", "h", "client", "033 33 333 33", { verified: true }))!;
  c2 = (await repo.createUser("c2@ex.mg", "Noro Andry", "h", "client", "033 44 444 44", { verified: true }))!;
  boss = (await repo.createUser("boss@alumg.mg", "Compte personnel du patron", "h", "admin", "", { verified: true }))!;
});

describe("téléchargements du PDF d'un devis", () => {
  it("compte ceux du menuisier et du client destinataire, par rôle, avec la date du dernier", async () => {
    const q = await repo.createQuote(m1, quote("sent"), { clientId: c1 });
    expect((await dl.downloadStats(q.id)).total).toBe(0);
    expect(await dl.recordDownload(m1, q.id)).toEqual({ ok: true });
    expect(await dl.recordDownload(c1, q.id)).toEqual({ ok: true });
    expect(await dl.recordDownload(c1, q.id)).toEqual({ ok: true });
    const s = await dl.downloadStats(q.id);
    expect(s).toMatchObject({ total: 3, menuisier: 1, client: 2 });
    expect(s.last).toBeInstanceOf(Date);
  });
  it("ignore un tiers, l'administration, et le client avant l'envoi du devis", async () => {
    const q = await repo.createQuote(m1, quote("sent"), { clientId: c1 });
    expect(await dl.recordDownload(c2, q.id)).toEqual({ error: "not_found" }); // un autre client
    expect(await dl.recordDownload(boss, q.id)).toEqual({ error: "not_found" }); // l'administration qui consulte ne gonfle pas le compteur
    const draft = await repo.createQuote(m1, quote("draft"), { clientId: c1 });
    expect(await dl.recordDownload(c1, draft.id)).toEqual({ error: "not_found" }); // le client ne voit pas encore ce brouillon
    expect(await dl.recordDownload(m1, crypto.randomUUID())).toEqual({ error: "not_found" });
    expect((await dl.downloadStats(q.id)).total).toBe(0);
  });
  it("l'administration lit le nombre sur chaque devis (liste et détail)", async () => {
    const q = await repo.createQuote(m1, quote("sent"), { clientId: c1 });
    await dl.recordDownload(m1, q.id);
    await dl.recordDownload(c1, q.id);
    expect((await admin.listAllQuotes({})).items.find((x) => x.id === q.id)?.downloads).toBe(2);
    expect((await admin.getAdminQuote(q.id))!.downloads).toMatchObject({ total: 2, menuisier: 1, client: 1 });
  });
});

describe("l'administration écrit à un client ou à un menuisier", () => {
  it("ouvre un échange avec n'importe quel client ou menuisier, et retrouve le même", async () => {
    const a = await chat.startConversation(asAdmin(boss), { user: c1 });
    const b = await chat.startConversation(asAdmin(boss), { user: m1 });
    expect(a).toMatchObject({ ok: true });
    expect(b).toMatchObject({ ok: true });
    expect(a.ok && b.ok && a.id !== b.id).toBe(true);
    expect(await chat.startConversation(asAdmin(boss), { user: c1 })).toEqual(a);
  });
  it("refuse à tout autre qu'un administrateur, vers un administrateur, ou vers un compte inconnu", async () => {
    expect(await chat.startConversation({ id: c1, role: "client" }, { user: c2 })).toEqual({ ok: false, error: "forbidden" });
    expect(await chat.startConversation({ id: m1, role: "menuisier" }, { user: c1 })).toEqual({ ok: false, error: "forbidden" });
    expect(await chat.startConversation(asAdmin(boss), { user: boss })).toEqual({ ok: false, error: "forbidden" });
    expect(await chat.startConversation(asAdmin(boss), { user: crypto.randomUUID() })).toEqual({ ok: false, error: "not_found" });
  });
  it("le destinataire voit le profil AluMg avec le logo, jamais le compte personnel de l'administrateur", async () => {
    const r = await chat.startConversation(asAdmin(boss), { user: c1 });
    if (!r.ok) throw new Error("conversation");
    await chat.sendMessage(boss, r.id, { body: "Bonjour, ici l'équipe AluMg.", files: [] });
    const list = await chat.listConversations(c1);
    const conv = list.find((c) => c.id === r.id)!;
    expect(conv.other).toMatchObject({ name: "AluMg", logo: "/brand/mark.svg", role: "admin", slug: "" });
    expect(JSON.stringify(conv)).not.toContain("patron");
    expect(conv.unread).toBe(1);
    expect((await chat.readMessages(c1, r.id))!.map((m) => m.body)).toEqual(["Bonjour, ici l'équipe AluMg."]);
    expect(await chat.unreadCount(c1)).toBe(0); // lire la conversation la marque lue
  });
  it("le client répond, l'administrateur voit la réponse et l'identité réelle du destinataire", async () => {
    const r = await chat.startConversation(asAdmin(boss), { user: c2 });
    if (!r.ok) throw new Error("conversation");
    await chat.sendMessage(boss, r.id, { body: "Votre devis est prêt ?", files: [] });
    await chat.sendMessage(c2, r.id, { body: "Oui, merci.", files: [] });
    const conv = (await chat.listConversations(boss)).find((c) => c.id === r.id)!;
    expect(conv.other).toMatchObject({ name: "Noro Andry", role: "client" });
    expect(conv.unread).toBe(1);
    expect(await chat.readMessages(m1, r.id)).toBeNull(); // un tiers n'entre pas dans la conversation
  });
});
