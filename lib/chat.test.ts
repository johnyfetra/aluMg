import { beforeAll, describe, expect, it } from "vitest";
import { lineSchema, quoteSchema } from "./model";

process.env.PGLITE_DIR = "memory://";
const repo = await import("./repo");
const pf = await import("./profiles");
const chat = await import("./chat");

let m1: string, m2: string, c1: string, c2: string, slug1: string, slug2: string;
const line = lineSchema.parse({ id: "x", category: "fenetre", opening: "coulissant", leaves: 2, shutter: "roulant", control: "manuel", guard: "barreaudage", range: "asiatique", finish: "blanc", infill: "vitree", glassType: "clair", thickness: "5", pattern: "none", extras: [], width: 1200, height: 1000, qty: 1, unit: 1000 });

beforeAll(async () => {
  m1 = (await repo.createUser("m1@ex.mg", "Rabe Alu", "h", "menuisier", "034 11 111 11"))!;
  m2 = (await repo.createUser("m2@ex.mg", "Sud Alu", "h", "menuisier", "034 22 222 22"))!;
  c1 = (await repo.createUser("c1@ex.mg", "Hery Rakoto", "h", "client", "033 33 333 33"))!;
  c2 = (await repo.createUser("c2@ex.mg", "Noro Andry", "h", "client", "033 44 444 44"))!;
  slug1 = (await pf.getOwnProfile(m1, "Rabe Alu")).slug;
  await pf.saveOwnProfile(m1, "Rabe Alu", { displayName: "Rabe Alu", city: "Tana", bio: "", specialties: [], logo: "", published: true });
  slug2 = (await pf.getOwnProfile(m2, "Sud Alu")).slug; // non publié
});

describe("messagerie", () => {
  let conv: string;

  it("un client ouvre une conversation avec un menuisier publié (pas avec un profil non publié)", async () => {
    expect(await chat.startConversation({ id: c1, role: "client" }, { menuisier: slug2 })).toEqual({ ok: false, error: "not_found" });
    const r = await chat.startConversation({ id: c1, role: "client" }, { menuisier: slug1 });
    expect(r.ok).toBe(true);
    conv = (r as { id: string }).id;
    // idempotent : même conversation
    expect(await chat.startConversation({ id: c1, role: "client" }, { menuisier: slug1 })).toEqual({ ok: true, id: conv });
  });

  it("un menuisier n'écrit qu'à un client qui lui a demandé un devis", async () => {
    expect(await chat.startConversation({ id: m1, role: "menuisier" }, { client: c2 })).toEqual({ ok: false, error: "forbidden" });
    await repo.createQuote(m1, quoteSchema.parse({ id: crypto.randomUUID(), number: "", date: "", status: "draft", client: { name: "Noro", phone: "", address: "" }, project: "", delay: "", notes: "", lines: [line], terms: { tva: 20, deposit: 50, validityDays: 30 } }), { clientId: c2 });
    const r = await chat.startConversation({ id: m1, role: "menuisier" }, { client: c2 });
    expect(r.ok).toBe(true);
    // les rôles ne se croisent pas : un client ne passe pas par « client », un menuisier pas par « menuisier »
    expect(await chat.startConversation({ id: c1, role: "client" }, { client: c2 })).toEqual({ ok: false, error: "forbidden" });
    expect(await chat.startConversation({ id: m1, role: "menuisier" }, { menuisier: slug1 })).toEqual({ ok: false, error: "forbidden" });
  });

  it("échange de messages, ordre, non lus et marquage comme lu", async () => {
    await chat.sendMessage(c1, conv, "Bonjour, êtes-vous disponible en décembre ?");
    await chat.sendMessage(c1, conv, "J'ai 3 fenêtres à poser.");
    expect(await chat.unreadCount(m1)).toBe(2);
    expect(await chat.unreadCount(c1)).toBe(0); // ses propres messages ne comptent pas
    const list = await chat.listConversations(m1);
    const mine = list.find((c) => c.id === conv)!;
    expect(mine).toMatchObject({ unread: 2, other: { id: c1, name: "Hery Rakoto", role: "client" }, last: { body: "J'ai 3 fenêtres à poser.", mine: false } });
    const msgs = (await chat.readMessages(m1, conv))!;
    expect(msgs.map((m) => [m.body, m.mine])).toEqual([["Bonjour, êtes-vous disponible en décembre ?", false], ["J'ai 3 fenêtres à poser.", false]]);
    expect(await chat.unreadCount(m1)).toBe(0); // ouvrir = lire
    await chat.sendMessage(m1, conv, "Oui, passez à l'atelier cette semaine.");
    expect(await chat.unreadCount(c1)).toBe(1);
    const clientView = (await chat.listConversations(c1)).find((c) => c.id === conv)!;
    expect(clientView.other).toMatchObject({ id: m1, name: "Rabe Alu", role: "menuisier", slug: slug1 });
    expect(clientView.unread).toBe(1);
  });

  it("?after ne renvoie que les nouveaux messages", async () => {
    const all = (await chat.readMessages(c1, conv))!;
    expect(all).toHaveLength(3);
    const since = all[1].at;
    expect((await chat.readMessages(c1, conv, since))!.map((m) => m.body)).toEqual(["Oui, passez à l'atelier cette semaine."]);
    expect((await chat.readMessages(c1, conv, "n'importe quoi"))!).toHaveLength(3); // date invalide ignorée
  });

  it("confidentialité : un tiers ne lit, n'écrit ni ne voit rien", async () => {
    expect(await chat.readMessages(c2, conv)).toBeNull();
    expect(await chat.sendMessage(c2, conv, "intrus")).toBeNull();
    expect(await chat.readMessages(m2, conv)).toBeNull();
    expect((await chat.listConversations(c2)).some((c) => c.id === conv)).toBe(false);
    expect((await chat.listConversations(m2)).length).toBe(0);
  });

  it("validation : message vide ou trop long refusé", () => {
    expect(chat.messageSchema.safeParse({ body: "   " }).success).toBe(false);
    expect(chat.messageSchema.safeParse({ body: "x".repeat(2001) }).success).toBe(false);
    expect(chat.messageSchema.safeParse({ body: "  Bonjour  " })).toMatchObject({ success: true, data: { body: "Bonjour" } });
  });
});
