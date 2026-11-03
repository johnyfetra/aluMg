import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";

// Cookie de session simulé : requireAdmin lit la session en base à partir de ce jeton.
const jar = { token: "" };
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (jar.token ? { value: jar.token } : undefined), set() {}, delete() {} }) }));

process.env.PGLITE_DIR = "memory://";
const { getDb, schema } = await import("./db");
const repo = await import("./repo");
const admin = await import("./admin");
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
  it("réinitialise : nouveau mot de passe et toutes les sessions coupées", async () => {
    const r = await admin.resetAccount(boss, clientId);
    if ("error" in r) throw new Error(r.error);
    const db = await getDb();
    expect(await db.select().from(schema.sessions).where(eq(schema.sessions.userId, clientId))).toHaveLength(0);
    expect(await verifyPassword(r.password, (await repo.findUserById(clientId))!.passwordHash)).toBe(true);
    expect(JSON.stringify((await admin.listAudit()).items)).not.toContain(r.password);
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
