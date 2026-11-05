import { beforeAll, describe, expect, it } from "vitest";

process.env.PGLITE_DIR = "memory://";
const repo = await import("./repo");
const pf = await import("./profiles");
const chat = await import("./chat");
const info = await import("./chat-info");
const { getDb, schema } = await import("./db");

let m: string, c: string, other: string, slug: string, conv: string;
const send = (u: string, body: string) => chat.sendMessage(u, conv, { body, files: [] });
const list = async (u: string) => (await chat.listConversations(u)).find((x) => x.id === conv);

beforeAll(async () => {
  m = (await repo.createUser("m@ex.mg", "Rabe Alu", "h", "menuisier", "034 11 111 11"))!;
  c = (await repo.createUser("c@ex.mg", "Hery Rakoto", "h", "client", "033 33 333 33"))!;
  other = (await repo.createUser("o@ex.mg", "Tiers", "h", "client", "033 44 444 44"))!;
  slug = (await pf.getOwnProfile(m, "Rabe Alu")).slug;
  await pf.saveOwnProfile(m, "Rabe Alu", { displayName: "Rabe Alu", city: "Tana", bio: "", specialties: [], logo: "", zones: [], sinceYear: null, published: true });
  const r = await chat.startConversation({ id: c, role: "client" }, { menuisier: slug });
  conv = (r as { id: string }).id;
});

describe("fiche de conversation", () => {
  it("médias, liens et messages importants", async () => {
    await chat.sendMessage(c, conv, { body: "Voir https://exemple.mg/modele.", files: [{ name: "plan.pdf", mime: "application/pdf", data: Buffer.from("%PDF-1").toString("base64") }] });
    const sent = await send(m, "Reçu");
    await info.runAction(c, conv, { action: "star", messageId: (sent as { message: { id: string } }).message.id, on: true });
    const i = (await info.conversationInfo(c, conv))!;
    expect(i.media.map((x) => x.name)).toEqual(["plan.pdf"]);
    expect(i.links.map((l) => l.url)).toEqual(["https://exemple.mg/modele"]); // la ponctuation finale n'est pas dans le lien
    expect(i.starred.map((x) => x.body)).toEqual(["Reçu"]);
    expect((await info.conversationInfo(m, conv))!.starred).toEqual([]); // l'étoile est personnelle
    expect(await info.conversationInfo(other, conv)).toBeNull(); // un tiers ne voit rien
  });

  it("blocage : personne n'écrit, et seul le bloqueur peut lever", async () => {
    expect(await info.updatePrefs(c, conv, { blocked: true })).toEqual({ ok: true });
    expect(await send(c, "x")).toEqual({ ok: false, error: "blocked" });
    expect(await send(m, "x")).toEqual({ ok: false, error: "blocked" });
    expect((await list(c))?.blocked).toBe("me");
    expect((await list(m))?.blocked).toBe("them");
    await info.updatePrefs(c, conv, { blocked: false });
    expect((await send(m, "de retour")).ok).toBe(true);
  });

  it("favori et sourdine sont personnels ; la sourdine sort le fil de la pastille", async () => {
    await info.updatePrefs(c, conv, { favorite: true, muted: true });
    expect(await list(c)).toMatchObject({ favorite: true, muted: true });
    expect(await list(m)).toMatchObject({ favorite: false, muted: false });
    expect(await chat.unreadCount(c)).toBe(0);
    await info.updatePrefs(c, conv, { muted: false });
  });

  it("effacer masque l'historique pour soi seul ; supprimer masque le fil jusqu'au prochain message", async () => {
    await info.runAction(c, conv, { action: "clear" });
    expect(await chat.readMessages(c, conv)).toEqual([]);
    expect((await chat.readMessages(m, conv))!.length).toBeGreaterThan(0);
    await info.runAction(c, conv, { action: "delete" });
    expect(await list(c)).toBeUndefined();
    expect(await list(m)).toBeDefined();
    await new Promise((r) => setTimeout(r, 5));
    await send(m, "toujours là ?");
    expect((await list(c))?.last?.body).toBe("toujours là ?");
  });

  it("messages éphémères : le nouveau message expire, l'ancien reste", async () => {
    await info.runAction(m, conv, { action: "ephemeral", seconds: 86_400 });
    const r = await send(m, "éphémère");
    const id = (r as { message: { id: string } }).message.id;
    const db = await getDb();
    const { eq } = await import("drizzle-orm");
    await db.update(schema.messages).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(schema.messages.id, id));
    expect((await chat.readMessages(c, conv))!.some((x) => x.id === id)).toBe(false);
  });

  it("signalement enregistré ; la plateforme ne se bloque ni ne se signale", async () => {
    expect(await info.runAction(c, conv, { action: "report", reason: "spam" })).toEqual({ ok: true });
    expect(await info.runAction(other, conv, { action: "report", reason: "spam" })).toEqual({ ok: false, error: "not_found" });
  });

  it("recherche de personnes : un client trouve les menuisiers publiés, un menuisier seulement ses clients", async () => {
    expect((await info.searchPeople({ id: c, role: "client" }, "rabe")).map((p) => p.target)).toEqual([{ menuisier: slug }]);
    expect(await info.searchPeople({ id: c, role: "client" }, "inconnu")).toEqual([]);
    expect(await info.searchPeople({ id: m, role: "menuisier" }, "hery")).toEqual([]); // pas encore de devis ensemble
    expect(await info.searchPeople({ id: c, role: "client" }, "%")).toEqual([]); // les jokers sont échappés
  });
});
