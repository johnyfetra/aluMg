import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { lineSchema, quoteSchema } from "./model";
import { socialUrlOk } from "./social";

// Cookie de session simulé : requireAdmin lit la session en base à partir de ce jeton.
const jar = { token: "" };
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (jar.token ? { value: jar.token } : undefined), set() {}, delete() {} }) }));

process.env.PGLITE_DIR = "memory://";
const { getDb, schema } = await import("./db");
const repo = await import("./repo");
const admin = await import("./admin");
const socials = await import("./socials");
const { requireAdmin, isResponse } = await import("./api");
const { hashPassword, verifyPassword } = await import("./password");
const { eq, sql } = await import("drizzle-orm");

let boss: { id: string; name: string }, clientId: string, joinerId: string, guardedId: string;
const sessionFor = async (userId: string, token: string) => {
  const db = await getDb();
  await db.insert(schema.sessions).values({ id: createHash("sha256").update(token).digest("hex"), userId, expiresAt: new Date(Date.now() + 864e5) });
};

beforeAll(async () => {
  const h = await hashPassword("secret-pass");
  boss = { id: (await repo.createUser("boss@alumg.mg", "Boss", h, "admin", "", { verified: true }))!, name: "Boss" };
  clientId = (await repo.createUser("rakoto@client.mg", "Rakoto Jean", h, "client", "034 12 345 67", { verified: true }))!;
  joinerId = (await repo.createUser("", "Atelier Fara", h, "menuisier", "033 98 765 43"))!;
  guardedId = (await repo.createUser("client@test.com", "Protégé", h, "client"))!;
  const db = await getDb();
  // une inscription datée d'il y a deux mois, pour vérifier le regroupement
  await db.update(schema.users).set({ createdAt: sql`now() - interval '2 months'` }).where(eq(schema.users.id, joinerId));
  await db.insert(schema.logins).values([{ userId: clientId }, { userId: clientId }, { userId: joinerId }]);
  await db.insert(schema.sessions).values([
    { id: "s1", userId: clientId, expiresAt: new Date(Date.now() + 864e5) },
    { id: "s2", userId: joinerId, expiresAt: new Date(Date.now() + 864e5), lastSeenAt: new Date(Date.now() - 10 * 60_000) },
  ]);
});

describe("statistiques", () => {
  it("compte les comptes par rôle et les connectés des 5 dernières minutes", async () => {
    const s = await admin.stats();
    expect(s.users).toMatchObject({ total: 4, client: 2, menuisier: 1, admin: 1, suspended: 0, online: 1 });
  });
  it("regroupe par jour, mois et année, périodes vides comprises", async () => {
    const s = await admin.stats();
    expect([s.signups.day.length, s.signups.month.length, s.signups.year.length]).toEqual([30, 12, 5]);
    expect(s.signups.day.at(-1)).toMatchObject({ n: 3 });
    expect(s.signups.day.at(-1)!.k).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(s.signups.day.slice(0, -1).every((p) => p.n === 0)).toBe(true);
    expect(s.signups.month.at(-3)!.n).toBe(1);
    expect(s.signups.month.reduce((a, p) => a + p.n, 0)).toBe(4);
    expect(s.logins.day.at(-1)!.n).toBe(3);
    expect(s.completed.year.every((p) => p.n === 0)).toBe(true);
  });
});

describe("recherche et pagination", () => {
  it("trouve par nom, e-mail ou téléphone (chiffres seuls)", async () => {
    const [rakoto] = (await admin.listUsers({ q: "rakoto" })).items;
    expect(rakoto.name).toBe("Rakoto Jean");
    expect(rakoto.lastSeenAt).toBeInstanceOf(Date); // date véritable, pas le texte brut de Postgres
    expect((await admin.listUsers({ q: "CLIENT.MG" })).total).toBe(1);
    expect((await admin.listUsers({ q: "033 98 76" })).items[0].name).toBe("Atelier Fara");
  });
  it("neutralise les jokers de LIKE", async () => {
    expect((await admin.listUsers({ q: "%" })).total).toBe(0);
    expect(admin.searchTerm("a_b")).toBe("%a\\_b%");
  });
  it("filtre par rôle et pagine par 25, bornes comprises", async () => {
    expect((await admin.listUsers({ role: "menuisier" })).items.map((u) => u.id)).toEqual([joinerId]);
    const h = await hashPassword("x-pass-123");
    for (let i = 0; i < 30; i++) await repo.createUser(`bulk${i}@test.mg`, `Bulk ${i}`, h, "client");
    const p1 = await admin.listUsers({ q: "bulk" });
    const p2 = await admin.listUsers({ q: "bulk", page: 2 });
    expect([p1.total, p1.items.length, p2.items.length]).toEqual([30, 25, 5]);
    expect(new Set([...p1.items, ...p2.items].map((u) => u.id)).size).toBe(30);
    expect((await admin.listUsers({ q: "bulk", page: 3 })).items).toEqual([]);
    expect((await admin.listUsers({ q: "bulk", page: -4 })).page).toBe(1);
    expect((await admin.listUsers({ page: 1e9 })).page).toBe(admin.MAX_PAGE);
  });
});

describe("devis et configuration (lecture seule)", () => {
  const line = lineSchema.parse({ id: "l", category: "fenetre", opening: "coulissant", leaves: 2, shutter: "roulant", control: "manuel", range: "asiatique", finish: "blanc", infill: "vitree", glassType: "clair", thickness: "5", pattern: "none", extras: [], width: 1200, height: 1000, qty: 2, unit: 100000 });
  const quote = (id: string, name: string) =>
    quoteSchema.parse({ id, number: "x", date: "2026-01-01T00:00:00.000Z", status: "draft", client: { name, phone: "", address: "" }, project: "Villa", delay: "", notes: "", lines: [line], terms: { tva: 20, deposit: 50, validityDays: 30 } });
  const Q1 = "00000000-0000-4000-8000-0000000000a1";
  const Q2 = "00000000-0000-4000-8000-0000000000a2";
  beforeAll(async () => {
    await repo.createQuote(joinerId, quote(Q1, "Rakoto Jean"), { clientId });
    await repo.createQuote(boss.id, quote(Q2, "Autre client"));
    await repo.saveSettings(joinerId, { ...(await repo.getSettings(joinerId)), company: "Atelier Fara SARL", logo: "data:image/png;base64,AAAA" });
  });
  it("liste tous les devis, avec émetteur et total TTC, et filtre par recherche, statut et compte", async () => {
    const all = await admin.listAllQuotes({});
    expect(all.total).toBe(2);
    expect(all.items.find((q) => q.id === Q1)).toMatchObject({ ownerName: "Atelier Fara", clientName: "Rakoto Jean", project: "Villa", ttc: 240000 });
    expect((await admin.listAllQuotes({ q: "autre client" })).items.map((q) => q.id)).toEqual([Q2]);
    expect((await admin.listAllQuotes({ q: "atelier fara" })).items.map((q) => q.id)).toEqual([Q1]);
    expect((await admin.listAllQuotes({ owner: "fara" })).items.map((q) => q.id)).toEqual([Q1]); // par menuisier
    expect((await admin.listAllQuotes({ client: "autre" })).items.map((q) => q.id)).toEqual([Q2]); // par client
    expect((await admin.listAllQuotes({ owner: "fara", client: "autre" })).total).toBe(0); // les deux filtres se cumulent
    expect((await admin.listAllQuotes({ status: "sent" })).total).toBe(0);
    expect((await admin.listAllQuotes({ user: clientId })).items.map((q) => q.id)).toEqual([Q1]); // le client voit ses devis reçus
  });
  it("rend un devis complet avec ses totaux, et null s'il n'existe pas", async () => {
    const db = await getDb();
    await db.insert(schema.quoteEvents).values([
      { quoteId: Q1, actorId: clientId, kind: "message", message: "Bonjour, quel délai ?" },
      { quoteId: Q1, actorId: clientId, kind: "line_comment", message: "Plutôt en gris", data: { lineId: "l" } },
    ]);
    const d = await admin.getAdminQuote(Q1);
    expect(d).toMatchObject({ ownerId: joinerId, clientId, totals: { ht: 200000, ttc: 240000 }, settings: { company: "Atelier Fara SARL", logo: "data:image/png;base64,AAAA" } });
    expect(d!.thread.map((e) => [e.kind, e.side])).toEqual([["message", "client"]]); // le fil : messages et étapes, sans les remarques d'ouvrage
    expect(d!.comments).toMatchObject([{ lineId: "l", body: "Plutôt en gris", side: "client" }]);
    expect(await admin.getAdminQuote("00000000-0000-4000-8000-0000000000ff")).toBeNull();
  });
  it("rend la configuration du compte sans les images (logo, signature) ; un client n'a pas de réglages", async () => {
    const c = await admin.getAccountConfig(joinerId);
    expect(c.settings).toMatchObject({ company: "Atelier Fara SARL", hasLogo: true, hasSignature: false });
    expect(c.settings).not.toHaveProperty("logo");
    expect((await admin.getAccountConfig(clientId)).settings).toBeNull();
  });
});

describe("réseaux sociaux de la plateforme", () => {
  const FB = "https://www.facebook.com/profile.php?id=61595904374968";
  it("la page Facebook de la plateforme est déjà enregistrée par la migration", async () => {
    const all = await socials.listSocial();
    expect(all[0]).toMatchObject({ network: "facebook", url: FB, visible: true });
    expect((await socials.listPublicSocial())[0]).toMatchObject({ network: "facebook", url: FB });
  });
  it("n'accepte que du https appartenant au réseau choisi", () => {
    expect(socialUrlOk("facebook", FB)).toBe(true);
    expect(socialUrlOk("facebook", "https://m.facebook.com/aluMg")).toBe(true);
    expect(socialUrlOk("instagram", FB)).toBe(false); // l'adresse d'un autre réseau
    expect(socialUrlOk("facebook", "http://facebook.com/aluMg")).toBe(false); // pas de http
    expect(socialUrlOk("facebook", "javascript:alert(1)")).toBe(false);
    expect(socialUrlOk("facebook", "https://facebook.com.pirate.mg/x")).toBe(false); // faux sous-domaine
    expect(socialUrlOk("facebook", "https://user:pw@facebook.com/x")).toBe(false);
  });
  it("ajoute, masque, ordonne et retire un réseau, chaque changement étant journalisé", async () => {
    const { id } = (await socials.createSocial(boss, { network: "instagram", label: "AluMg Insta", url: "https://www.instagram.com/alumg", visible: true })) as { id: string };
    expect((await socials.listSocial()).map((s) => s.network)).toEqual(["facebook", "instagram"]);
    expect(await socials.updateSocial(boss, id, { url: "https://example.com/x" })).toEqual({ error: "invalid" }); // l'adresse doit rester celle du réseau
    expect(await socials.updateSocial(boss, id, { visible: false })).toEqual({ ok: true });
    expect((await socials.listPublicSocial()).map((s) => s.network)).toEqual(["facebook"]); // masqué : plus public
    await socials.moveSocial(id, "up");
    expect((await socials.listSocial()).map((s) => s.network)).toEqual(["instagram", "facebook"]);
    expect(await socials.deleteSocial(boss, id)).toEqual({ ok: true });
    expect(await socials.deleteSocial(boss, id)).toEqual({ error: "not_found" });
    expect((await admin.listAudit()).items.slice(0, 3).map((e) => e.action)).toEqual(["social_delete", "social_edit", "social_add"]);
  });
});

describe("autorisation", () => {
  it("refuse sans session (401), à un non-admin (403) et à un admin suspendu (401)", async () => {
    jar.token = "";
    expect((await requireAdmin()) as Response).toMatchObject({ status: 401 });
    await sessionFor(clientId, "tok-client");
    jar.token = "tok-client";
    expect((await requireAdmin()) as Response).toMatchObject({ status: 403 });
    const other = (await repo.createUser("admin2@alumg.mg", "Admin 2", "h", "admin", "", { verified: true }))!;
    await sessionFor(other, "tok-admin2");
    jar.token = "tok-admin2";
    expect(isResponse(await requireAdmin())).toBe(false);
    await admin.setSuspended(boss, other, true);
    expect((await requireAdmin()) as Response).toMatchObject({ status: 401 });
    jar.token = "";
  });
});

describe("actions sur les comptes", () => {
  it("crée un compte vérifié avec un mot de passe temporaire, journalisé sans le mot de passe", async () => {
    const r = await admin.createAccount(boss, { role: "menuisier", name: "Nouvel atelier", email: "Neuf@Atelier.mg", phone: "" });
    if ("error" in r) throw new Error(r.error);
    const u = await repo.findUserById(r.id);
    expect([u?.email, !!u?.emailVerifiedAt]).toEqual(["neuf@atelier.mg", true]);
    expect(await verifyPassword(r.password, u!.passwordHash)).toBe(true);
    expect(await admin.createAccount(boss, { role: "client", name: "x", email: "neuf@atelier.mg", phone: "" })).toEqual({ error: "email_taken" });
    expect(await admin.createAccount(boss, { role: "client", name: "x", email: "", phone: "+261 34 12 345 67" })).toEqual({ error: "phone_taken" });
    const { items } = await admin.listAudit();
    expect(items[0]).toMatchObject({ action: "create", targetId: r.id, actorName: "Boss" });
    expect(JSON.stringify(items)).not.toContain(r.password);
  });
  it("le mot de passe temporaire est facile à recopier : 12 caractères sans 0/O ni 1/I/l", () => {
    for (let i = 0; i < 50; i++) expect(admin.tempPassword()).toMatch(/^[A-HJ-NP-Z2-9]{12}$/);
  });
  it("réinitialise : nouveau mot de passe et toutes les sessions coupées", async () => {
    const r = await admin.resetAccount(boss, clientId);
    if ("error" in r) throw new Error(r.error);
    const db = await getDb();
    expect(await db.select().from(schema.sessions).where(eq(schema.sessions.userId, clientId))).toHaveLength(0);
    expect(await verifyPassword(r.password, (await repo.findUserById(clientId))!.passwordHash)).toBe(true);
    expect(JSON.stringify((await admin.listAudit()).items)).not.toContain(r.password);
    expect((await repo.findUserById(clientId))!.mustChangePassword).toBe(true); // mot de passe donné par l'administration : à remplacer à la première connexion
  });
  it("suspend (sessions coupées) puis réactive ; répéter l'action n'écrit rien de plus", async () => {
    const db = await getDb();
    await db.insert(schema.sessions).values({ id: "s3", userId: clientId, expiresAt: new Date(Date.now() + 864e5) });
    expect(await admin.setSuspended(boss, clientId, true)).toEqual({ ok: true });
    expect(await db.select().from(schema.sessions).where(eq(schema.sessions.userId, clientId))).toHaveLength(0);
    expect((await admin.listUsers({ status: "suspended" })).items.map((u) => u.id)).toContain(clientId);
    const before = (await admin.listAudit()).total;
    expect(await admin.setSuspended(boss, clientId, true)).toEqual({ ok: true });
    expect((await admin.listAudit()).total).toBe(before);
    await admin.setSuspended(boss, clientId, false);
    expect((await admin.listUsers({ status: "suspended" })).items.map((u) => u.id)).not.toContain(clientId);
  });
  it("protège les comptes réservés et l'administrateur lui-même", async () => {
    for (const r of [await admin.resetAccount(boss, guardedId), await admin.deleteAccount(boss, guardedId, "client@test.com"), await admin.setSuspended(boss, guardedId, true), await admin.setRole(boss, guardedId, "admin")]) expect(r).toEqual({ error: "protected" });
    expect(await admin.deleteAccount(boss, boss.id, "boss@alumg.mg")).toEqual({ error: "self" });
    expect(await admin.setRole(boss, boss.id, "client")).toEqual({ error: "self" });
    expect(await admin.setSuspended(boss, boss.id, true)).toEqual({ error: "self" });
    expect(admin.isProtected("FETRAJOHNY05@gmail.com")).toBe(true);
    expect(await repo.findUserById(guardedId)).not.toBeNull();
  });
  it("accorde le badge d'un menuisier et le journalise", async () => {
    const db = await getDb();
    await db.insert(schema.menuisierProfiles).values({ userId: joinerId, slug: "atelier-fara", displayName: "Atelier Fara" });
    expect(await admin.setBadge(boss, "atelier-fara", true)).toEqual({ ok: true });
    expect(await admin.setBadge(boss, "inconnu", true)).toEqual({ error: "not_found" });
    expect((await admin.listAudit()).items[0]).toMatchObject({ action: "badge_on", targetId: joinerId });
  });
  it("supprime seulement avec l'identifiant retapé", async () => {
    expect(await admin.deleteAccount(boss, joinerId, "mauvais")).toEqual({ error: "confirm_mismatch" });
    expect(await repo.findUserById(joinerId)).not.toBeNull();
    expect(await admin.deleteAccount(boss, joinerId, "033 98 765 43")).toEqual({ ok: true });
    expect(await repo.findUserById(joinerId)).toBeNull();
    expect((await admin.listAudit()).items[0]).toMatchObject({ action: "delete", targetId: joinerId, targetLabel: "Atelier Fara (033 98 765 43)" });
  });
});
