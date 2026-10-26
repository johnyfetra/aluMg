import { beforeAll, describe, expect, it } from "vitest";
import { lineSchema, quoteSchema } from "./model";

process.env.PGLITE_DIR = "memory://";
const repo = await import("./repo");
const pf = await import("./profiles");
const chat = await import("./chat");

const send = (u: string, c: string, body: string) => chat.sendMessage(u, c, { body, files: [] });
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
    // le client d'un devis écrit au menuisier de ce devis même sans profil publié ; pas à un menuisier sans lien
    expect(await chat.startConversation({ id: c2, role: "client" }, { menuisierId: m1 })).toEqual({ ok: true, id: (r as { id: string }).id });
    expect(await chat.startConversation({ id: c2, role: "client" }, { menuisierId: m2 })).toEqual({ ok: false, error: "forbidden" });
    // les rôles ne se croisent pas : un client ne passe pas par « client », un menuisier pas par « menuisier »
    expect(await chat.startConversation({ id: c1, role: "client" }, { client: c2 })).toEqual({ ok: false, error: "forbidden" });
    expect(await chat.startConversation({ id: m1, role: "menuisier" }, { menuisier: slug1 })).toEqual({ ok: false, error: "forbidden" });
  });

  it("échange de messages, ordre, non lus et marquage comme lu", async () => {
    await send(c1, conv, "Bonjour, êtes-vous disponible en décembre ?");
    await send(c1, conv, "J'ai 3 fenêtres à poser.");
    expect(await chat.unreadCount(m1)).toBe(2);
    expect(await chat.unreadCount(c1)).toBe(0); // ses propres messages ne comptent pas
    const list = await chat.listConversations(m1);
    const mine = list.find((c) => c.id === conv)!;
    expect(mine).toMatchObject({ unread: 2, other: { id: c1, name: "Hery Rakoto", role: "client" }, last: { body: "J'ai 3 fenêtres à poser.", mine: false } });
    const msgs = (await chat.readMessages(m1, conv))!;
    expect(msgs.map((m) => [m.body, m.mine])).toEqual([["Bonjour, êtes-vous disponible en décembre ?", false], ["J'ai 3 fenêtres à poser.", false]]);
    expect(await chat.unreadCount(m1)).toBe(0); // ouvrir = lire
    await send(m1, conv, "Oui, passez à l'atelier cette semaine.");
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
    expect(await send(c2, conv, "intrus")).toEqual({ ok: false, error: "not_found" });
    expect(await chat.readMessages(m2, conv)).toBeNull();
    expect((await chat.listConversations(c2)).some((c) => c.id === conv)).toBe(false);
    expect((await chat.listConversations(m2)).length).toBe(0);
  });

  it("validation : message vide ou trop long refusé", () => {
    expect(chat.messageSchema.safeParse({ body: "   " }).success).toBe(false); // ni texte, ni fichier, ni devis
    expect(chat.messageSchema.safeParse({ body: "x".repeat(2001) }).success).toBe(false);
    expect(chat.messageSchema.safeParse({ body: "  Bonjour  " })).toMatchObject({ success: true, data: { body: "Bonjour" } });
  });

  describe("pièces jointes, réponses et devis cités", () => {
    const pdf = Buffer.from("%PDF-1.4 test").toString("base64");
    let first: string;

    it("envoie un fichier, une photo et lit leur contenu ; un tiers n'y accède pas", async () => {
      const r = await chat.sendMessage(c1, conv, { body: "Voici le plan", files: [{ name: "plan.pdf", mime: "application/pdf", data: pdf }, { name: "mur.jpg", mime: "image/jpeg", data: Buffer.from("jpg").toString("base64") }] });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      first = r.message.id;
      expect(r.message.attachments.map((a) => [a.name, a.mime])).toEqual([["plan.pdf", "application/pdf"], ["mur.jpg", "image/jpeg"]]);
      const got = await chat.getAttachment(m1, r.message.attachments[0].id);
      expect(got?.bytes.toString()).toBe("%PDF-1.4 test");
      expect(await chat.getAttachment(c2, r.message.attachments[0].id)).toBeNull();
      expect(await chat.getAttachment(m2, r.message.attachments[0].id)).toBeNull();
      // le contenu n'est jamais dans la liste des messages
      expect(JSON.stringify(await chat.readMessages(m1, conv))).not.toContain(pdf);
    });

    it("refuse les types non autorisés, les extensions trompeuses et les fichiers trop lourds", async () => {
      const bad = (name: string, mime: string, data = pdf) => chat.sendMessage(c1, conv, { body: "x", files: [{ name, mime, data }] });
      expect(await bad("virus.exe", "application/x-msdownload")).toEqual({ ok: false, error: "bad_file" });
      expect(await bad("page.html", "text/html")).toEqual({ ok: false, error: "bad_file" });
      expect(await bad("photo.png", "application/pdf")).toEqual({ ok: false, error: "bad_file" }); // extension qui ne correspond pas au type
      expect(await bad("gros.pdf", "application/pdf", Buffer.alloc(3_100_000).toString("base64"))).toEqual({ ok: false, error: "too_big" });
    });

    it("répond à un message du même fil ; refuse un message d'un autre fil", async () => {
      const r = await chat.sendMessage(m1, conv, { body: "Reçu, merci", replyToId: first, files: [] });
      expect(r.ok && r.message.replyTo).toMatchObject({ id: first, body: "Voici le plan", mine: false, files: 2 });
      expect(await chat.sendMessage(m1, conv, { body: "x", replyToId: crypto.randomUUID(), files: [] })).toEqual({ ok: false, error: "bad_reply" });
    });

    it("cite un devis envoyé au client (pas un brouillon, pas celui d'un autre client)", async () => {
      const mk = async (clientId: string | null) => (await repo.createQuote(m1, quoteSchema.parse({ id: crypto.randomUUID(), number: "", date: "", status: "sent", client: { name: "Hery", phone: "", address: "" }, project: "Villa", delay: "", notes: "", lines: [line], terms: { tva: 20, deposit: 50, validityDays: 30 } }), { clientId })).id;
      const mine = await mk(c1);
      const other = await mk(c2);
      expect((await chat.citableQuotes(m1, conv))!.map((q) => q.id)).toEqual([mine]);
      const r = await chat.sendMessage(m1, conv, { body: "", quoteId: mine, files: [] });
      expect(r.ok && r.message.quote).toMatchObject({ id: mine, project: "Villa", status: "sent", total: 1200, href: `/devis/${mine}` });
      // le client voit le même devis avec son propre lien
      const seen = (await chat.readMessages(c1, conv))!.find((m) => m.quote);
      expect(seen?.quote?.href).toBe(`/espace-client/devis/${mine}`);
      expect(await chat.sendMessage(m1, conv, { body: "", quoteId: other, files: [] })).toEqual({ ok: false, error: "bad_quote" });
      expect(await chat.citableQuotes(c2, conv)).toBeNull();
    });
  });

  describe("accusés (envoyé, reçu, lu), saisie en cours et vocaux", () => {
    it("un message passe de envoyé à reçu (l'autre reçoit la liste) puis lu (l'autre ouvre le fil)", async () => {
      const r = await send(c1, conv, "Accusés ?");
      expect(r.ok && r.message.receipt).toBe("sent");
      const seen = async () => (await chat.readMessages(c1, conv))!.find((m) => m.body === "Accusés ?")!.receipt;
      // le menuisier reçoit sa liste de conversations : reçu, pas encore lu
      await new Promise((x) => setTimeout(x, 15));
      await chat.listConversations(m1);
      expect(await seen()).toBe("delivered");
      expect((await chat.listConversations(c1)).find((c) => c.id === conv)!.last).toMatchObject({ mine: true, receipt: "delivered" });
      await new Promise((x) => setTimeout(x, 15));
      await chat.readMessages(m1, conv);
      expect(await seen()).toBe("read");
      // les messages reçus n'ont pas d'accusé
      expect((await chat.readMessages(m1, conv))!.find((m) => m.body === "Accusés ?")!.receipt).toBeNull();
    });

    it("« en train d'écrire » : visible par l'autre seulement, s'efface à l'envoi", async () => {
      expect(await chat.getTyping(m1, conv)).toBeNull();
      expect(await chat.setTyping(c1, conv, "text")).toBe(true);
      expect(await chat.getTyping(m1, conv)).toBe("text");
      expect(await chat.getTyping(c1, conv)).toBeNull(); // on ne se voit pas soi-même
      await chat.setTyping(c1, conv, "voice");
      expect(await chat.getTyping(m1, conv)).toBe("voice");
      await send(c1, conv, "fini");
      expect(await chat.getTyping(m1, conv)).toBeNull();
      expect(await chat.setTyping(c2, conv, "text")).toBe(false); // un tiers ne peut pas
      expect(await chat.getTyping(c2, conv)).toBeUndefined();
    });

    it("un message vocal garde sa durée ; seul l'audio en a une", async () => {
      const audio = Buffer.from("OggS-fake").toString("base64");
      const r = await chat.sendMessage(c1, conv, { body: "", files: [{ name: "vocal.webm", mime: "audio/webm", data: audio, durationMs: 12_500 }, { name: "n.pdf", mime: "application/pdf", data: Buffer.from("%PDF").toString("base64"), durationMs: 99 }] });
      expect(r.ok && r.message.attachments.map((a) => a.durationMs)).toEqual([12_500, null]);
    });
  });
});
