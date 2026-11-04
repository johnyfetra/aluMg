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

describe("un client ou un menuisier écrit au support AluMg", () => {
  it("ouvre le fil avec l'administration sous le profil AluMg, et retrouve le même fil que l'administrateur", async () => {
    const r = await chat.startConversation({ id: m1, role: "menuisier" }, { support: true });
    if (!r.ok) throw new Error("support");
    expect(await chat.startConversation({ id: m1, role: "menuisier" }, { support: true })).toEqual({ ok: true, id: r.id });
    expect((await chat.startConversation(asAdmin(boss), { user: m1 }))).toEqual({ ok: true, id: r.id });
    expect((await chat.listConversations(m1)).find((c) => c.id === r.id)!.other).toMatchObject({ name: "AluMg", role: "admin" });
    await chat.sendMessage(m1, r.id, { body: "Bonjour, une question.", files: [] });
    expect((await chat.listConversations(boss)).find((c) => c.id === r.id)).toMatchObject({ unread: 1, other: { name: "Rabe Alu", role: "menuisier" } });
  });
  it("refuse à l'administration (elle écrit à un compte précis)", async () => {
    expect(await chat.startConversation(asAdmin(boss), { support: true })).toEqual({ ok: false, error: "forbidden" });
  });
});

describe("un seul compte de support pour toute l'administration", () => {
  it("deux administrateurs partagent le même fil, sous le compte de support", async () => {
    const boss2 = (await repo.createUser("boss2@alumg.mg", "Second admin", "h", "admin", "", { verified: true }))!;
    const c3 = (await repo.createUser("c3@ex.mg", "Tina", "h", "client", "033 55 555 55", { verified: true }))!;
    const a = await chat.startConversation(asAdmin(boss2), { user: c3 });
    const b = await chat.startConversation(asAdmin(boss), { user: c3 });
    if (!a.ok || !b.ok) throw new Error("fil");
    expect(a.id).toBe(b.id);
    await chat.sendMessage(boss2, a.id, { body: "Message du second admin", files: [] });
    await chat.sendMessage(boss, a.id, { body: "Réponse du premier", files: [] });
    expect((await chat.listConversations(c3)).filter((c) => c.other.role === "admin")).toHaveLength(1);
    expect((await chat.listConversations(c3)).find((c) => c.id === a.id)).toMatchObject({ unread: 2, other: { name: "AluMg" } });
    // l'un répond là où l'autre a écrit, et voit les messages de l'autre comme les siens
    const seen = await chat.readMessages(boss2, a.id);
    expect(seen?.map((m) => m.mine)).toEqual([true, true]);
    expect(await chat.unreadCount(boss2)).toBe(await chat.unreadCount(boss));
  });
});

