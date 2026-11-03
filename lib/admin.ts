import { randomBytes } from "node:crypto";
import { and, count, desc, eq, gt, isNotNull, isNull, or, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { USER_SEARCH } from "./db/schema";
import type { AuditAction, Role } from "./model";
import { hashPassword } from "./password";
import { normalizePhone } from "./phone";

// Espace d'administration : statistiques, comptes, journal. Appelé seulement par les routes /api/admin/* (requireAdmin, session vérifiée en base).
// Chaque action sensible s'exécute en une transaction avec sa ligne de journal : l'action et sa trace réussissent ou échouent ensemble.

// Comptes jamais supprimables, réinitialisables, suspendus ni rétrogradés, quel que soit l'appelant (interface, script, test).
export const PROTECTED = ["fetrajohny05@gmail.com", "client@test.com"];
export const PAGE_SIZE = 25;
// shortcut: pagination par offset plafonnée à 10 000 lignes et total exact recalculé à chaque page, passer à un curseur (created_at, id) et à un total estimé au-delà de quelques centaines de milliers de comptes.
export const MAX_PAGE = 400;
export const ONLINE_MINUTES = 5; // « connecté en ce moment » : activité de session plus récente que ce délai
const TZ = "Indian/Antananarivo"; // les jours et les mois des statistiques suivent l'heure de Madagascar

export type Actor = { id: string; name: string };
export type Unit = "day" | "month" | "year";
export type Point = { k: string; n: number };
export type Series = Record<Unit, Point[]>;
// Fenêtres des statistiques : 30 jours, 12 mois, 5 ans.
const SPAN: Record<Unit, { n: number; fmt: string }> = { day: { n: 30, fmt: "YYYY-MM-DD" }, month: { n: 12, fmt: "YYYY-MM" }, year: { n: 5, fmt: "YYYY" } };

type Tx = Pick<Awaited<ReturnType<typeof getDb>>, "insert">;
export async function audit(db: Tx, actor: Actor, action: AuditAction, target: { id: string | null; label: string }, data: Record<string, unknown> = {}) {
  await db.insert(schema.adminAudit).values({ actorId: actor.id, actorName: actor.name, action, targetId: target.id, targetLabel: target.label, data });
}

// ---------- Statistiques (tout est compté en SQL) ----------

// Une valeur par jour / mois / année, périodes vides comprises (generate_series) ; la jointure par intervalle sert l'index de la colonne de date.
// Table, colonne et filtre sont des constantes de ce fichier, jamais une saisie : sql.raw est sans risque ici.
async function series(table: string, column: string, unit: Unit, extra = ""): Promise<Point[]> {
  const db = await getDb();
  const { n, fmt } = SPAN[unit];
  const start = `date_trunc('${unit}', now() at time zone '${TZ}')`;
  const r = await db.execute(sql.raw(`
    select to_char(g.b, '${fmt}') as k, count(t.${column})::int as n
    from generate_series(${start} - interval '${n - 1} ${unit}', ${start}, interval '1 ${unit}') g(b)
    left join ${table} t on t.${column} >= (g.b at time zone '${TZ}') and t.${column} < ((g.b + interval '1 ${unit}') at time zone '${TZ}') ${extra}
    group by g.b order by g.b`));
  return (r as unknown as { rows: Point[] }).rows; // PGlite et node-postgres renvoient tous deux `rows`
}
const allUnits = async (table: string, column: string, extra = ""): Promise<Series> => ({
  day: await series(table, column, "day", extra),
  month: await series(table, column, "month", extra),
  year: await series(table, column, "year", extra),
});

export async function stats() {
  const db = await getDb();
  const u = schema.users;
  const [users] = await db
    .select({
      total: count(),
      client: sql<number>`count(*) filter (where ${u.role} = 'client')::int`,
      menuisier: sql<number>`count(*) filter (where ${u.role} = 'menuisier')::int`,
      admin: sql<number>`count(*) filter (where ${u.role} = 'admin')::int`,
      suspended: sql<number>`count(*) filter (where ${u.suspendedAt} is not null)::int`,
    })
    .from(u);
  const [{ online }] = await db
    .select({ online: sql<number>`count(distinct ${schema.sessions.userId})::int` })
    .from(schema.sessions)
    .where(and(gt(schema.sessions.lastSeenAt, sql`now() - make_interval(mins => ${ONLINE_MINUTES})`), gt(schema.sessions.expiresAt, sql`now()`)));
  return {
    users: { ...users, online },
    signups: await allUnits("users", "created_at"),
    logins: await allUnits("logins", "created_at"),
    quotes: await allUnits("quotes", "created_at"),
    completed: await allUnits("quote_events", "created_at", "and t.kind = 'completed'"),
  };
}
export type AdminStats = Awaited<ReturnType<typeof stats>>;

// ---------- Comptes ----------

export type UserFilter = { q?: string; role?: Role; status?: "active" | "suspended"; verified?: "yes" | "no"; page?: number };
export type PageOf<T> = { items: T[]; total: number; page: number; pageSize: number };
const clampPage = (page = 1) => Math.min(Math.max(1, Math.trunc(page) || 1), MAX_PAGE);

// « contient » insensible à la casse, jokers de LIKE neutralisés ; un numéro se cherche sur ses chiffres seuls (« 034 12 » trouve « 0341234567 »).
export function searchTerm(q: string) {
  const s = q.trim().toLowerCase();
  const term = /^[+\d\s().-]+$/.test(s) ? s.replace(/\D/g, "") : s;
  return term ? `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
}

const verifiedSql = or(isNotNull(schema.users.phoneVerifiedAt), isNotNull(schema.users.emailVerifiedAt))!;
// Dernière activité : sous-requête corrélée servie par l'index sessions(user_id), une seule requête pour toute la page.
const lastSeenSql = sql<Date | null>`(select max(s.last_seen_at) from sessions s where s.user_id = ${schema.users.id})`.mapWith(schema.sessions.lastSeenAt);

export async function listUsers(f: UserFilter) {
  const db = await getDb();
  const u = schema.users;
  const like = searchTerm(f.q ?? "");
  const where = and(
    like ? sql`${USER_SEARCH} like ${like}` : undefined,
    f.role ? eq(u.role, f.role) : undefined,
    f.status === "suspended" ? isNotNull(u.suspendedAt) : f.status === "active" ? isNull(u.suspendedAt) : undefined,
    f.verified === "yes" ? verifiedSql : f.verified === "no" ? sql`not (${verifiedSql})` : undefined,
  );
  const page = clampPage(f.page);
  const [{ total }] = await db.select({ total: count() }).from(u).where(where);
  const items = await db
    .select({
      id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, createdAt: u.createdAt,
      suspended: sql<boolean>`${u.suspendedAt} is not null`,
      verified: sql<boolean>`${verifiedSql}`,
      badge: schema.menuisierProfiles.verified,
      lastSeenAt: lastSeenSql,
    })
    .from(u)
    .leftJoin(schema.menuisierProfiles, eq(schema.menuisierProfiles.userId, u.id))
    .where(where)
    .orderBy(desc(u.createdAt), u.id)
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);
  return { items, total, page, pageSize: PAGE_SIZE };
}
export type AdminUserRow = Awaited<ReturnType<typeof listUsers>>["items"][number];

export async function getUser(id: string) {
  const db = await getDb();
  const u = schema.users;
  const [row] = await db
    .select({
      id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, createdAt: u.createdAt, suspendedAt: u.suspendedAt,
      verified: sql<boolean>`${verifiedSql}`,
      slug: schema.menuisierProfiles.slug, badge: schema.menuisierProfiles.verified, published: schema.menuisierProfiles.published,
      quotesOwned: sql<number>`(select count(*)::int from quotes q where q.user_id = ${u.id})`,
      quotesAsClient: sql<number>`(select count(*)::int from quotes q where q.client_id = ${u.id})`,
      sessions: sql<number>`(select count(*)::int from sessions s where s.user_id = ${u.id} and s.expires_at > now())`,
      lastSeenAt: lastSeenSql,
      lastLoginAt: sql<Date | null>`(select max(l.created_at) from logins l where l.user_id = ${u.id})`.mapWith(schema.logins.createdAt),
    })
    .from(u)
    .leftJoin(schema.menuisierProfiles, eq(schema.menuisierProfiles.userId, u.id))
    .where(eq(u.id, id));
  return row ? { ...row, protected: isProtected(row.email) } : null;
}
export type AdminUser = NonNullable<Awaited<ReturnType<typeof getUser>>>;

export const isProtected = (email: string | null) => !!email && PROTECTED.includes(email.toLowerCase());
const label = (u: { name: string; email: string | null; phone: string }) => `${u.name} (${u.email || u.phone})`;
// Mot de passe temporaire : 16 caractères aléatoires, renvoyé une seule fois à l'administrateur, jamais journalisé.
const tempPassword = () => randomBytes(12).toString("base64url");

export const FAIL_STATUS = { not_found: 404, protected: 403, self: 403, email_taken: 409, phone_taken: 409, confirm_mismatch: 400 } as const;
type Fail = { error: keyof typeof FAIL_STATUS };
type User = typeof schema.users.$inferSelect;

// Action sensible sur un compte : ligne verrouillée (FOR UPDATE) dans une transaction ; ni compte protégé, ni soi-même.
async function onAccount<T>(actor: Actor, id: string, run: (tx: Parameters<Parameters<Awaited<ReturnType<typeof getDb>>["transaction"]>[0]>[0], user: User) => Promise<T | Fail>): Promise<T | Fail> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(schema.users).where(eq(schema.users.id, id)).for("update");
    if (!user) return { error: "not_found" } as const;
    if (isProtected(user.email)) return { error: "protected" } as const;
    if (user.id === actor.id) return { error: "self" } as const;
    return run(tx, user);
  });
}

// Créé par l'administration : le canal fourni (e-mail et/ou téléphone) est tenu pour vérifié.
export async function createAccount(actor: Actor, input: { role: Role; name: string; email: string; phone: string }): Promise<{ id: string; password: string } | Fail> {
  const db = await getDb();
  const email = input.email.trim().toLowerCase() || null;
  const phoneNorm = normalizePhone(input.phone);
  const password = tempPassword();
  const passwordHash = await hashPassword(password); // hors transaction : le hachage est volontairement lent
  return db.transaction(async (tx) => {
    if (email && (await tx.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email))).length) return { error: "email_taken" } as const;
    const now = new Date();
    const [u] = await tx
      .insert(schema.users)
      .values({ email, name: input.name, passwordHash, role: input.role, phone: input.phone.trim(), phoneNorm, emailVerifiedAt: email ? now : null, phoneVerifiedAt: phoneNorm ? now : null })
      .onConflictDoNothing()
      .returning({ id: schema.users.id });
    if (!u) return { error: phoneNorm ? "phone_taken" : "email_taken" } as const;
    if (input.role === "menuisier") await tx.insert(schema.settings).values({ userId: u.id }).onConflictDoNothing();
    await audit(tx, actor, "create", { id: u.id, label: label({ ...input, email }) }, { role: input.role });
    return { id: u.id, password };
  });
}

// Nouveau mot de passe temporaire, toutes les sessions du compte révoquées, journal : une seule transaction.
export async function resetAccount(actor: Actor, id: string): Promise<{ password: string } | Fail> {
  const password = tempPassword();
  const passwordHash = await hashPassword(password);
  return onAccount(actor, id, async (tx, user) => {
    await tx.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, id));
    await tx.delete(schema.sessions).where(eq(schema.sessions.userId, id));
    await audit(tx, actor, "reset", { id, label: label(user) });
    return { password };
  });
}

// Idempotent : suspendre un compte déjà suspendu (ou réactiver un compte actif) ne change rien et n'écrit rien au journal.
export async function setSuspended(actor: Actor, id: string, suspended: boolean): Promise<{ ok: true } | Fail> {
  return onAccount(actor, id, async (tx, user) => {
    if (!!user.suspendedAt === suspended) return { ok: true } as const;
    await tx.update(schema.users).set({ suspendedAt: suspended ? new Date() : null }).where(eq(schema.users.id, id));
    if (suspended) await tx.delete(schema.sessions).where(eq(schema.sessions.userId, id));
    await audit(tx, actor, suspended ? "suspend" : "reactivate", { id, label: label(user) });
    return { ok: true } as const;
  });
}

export async function setRole(actor: Actor, id: string, role: Role): Promise<{ ok: true } | Fail> {
  return onAccount(actor, id, async (tx, user) => {
    if (user.role === role) return { ok: true } as const;
    await tx.update(schema.users).set({ role }).where(eq(schema.users.id, id));
    if (role === "menuisier") await tx.insert(schema.settings).values({ userId: id }).onConflictDoNothing();
    await audit(tx, actor, "role", { id, label: label(user) }, { from: user.role, to: role });
    return { ok: true } as const;
  });
}

// Confirmation forte : l'administrateur retape l'e-mail (ou, à défaut, le téléphone) du compte.
export async function deleteAccount(actor: Actor, id: string, confirm: string): Promise<{ ok: true } | Fail> {
  return onAccount(actor, id, async (tx, user) => {
    if (confirm.trim().toLowerCase() !== (user.email || user.phone).toLowerCase()) return { error: "confirm_mismatch" } as const;
    await tx.delete(schema.users).where(eq(schema.users.id, id));
    await audit(tx, actor, "delete", { id, label: label(user) }, { role: user.role });
    return { ok: true } as const;
  });
}

// Badge « Vérifié » d'un menuisier (par l'adresse de son profil public). Idempotent, comme la suspension.
export async function setBadge(actor: Actor, slug: string, verified: boolean): Promise<{ ok: true } | Fail> {
  const db = await getDb();
  const p = schema.menuisierProfiles;
  return db.transaction(async (tx) => {
    const [row] = await tx.select({ userId: p.userId, verified: p.verified, name: p.displayName }).from(p).where(eq(p.slug, slug)).for("update");
    if (!row) return { error: "not_found" } as const;
    if (row.verified === verified) return { ok: true } as const;
    await tx.update(p).set({ verified }).where(eq(p.slug, slug));
    await audit(tx, actor, verified ? "badge_on" : "badge_off", { id: row.userId, label: row.name });
    return { ok: true } as const;
  });
}

export async function listAudit(page?: number) {
  const db = await getDb();
  const a = schema.adminAudit;
  const p = clampPage(page);
  const [{ total }] = await db.select({ total: count() }).from(a);
  const items = await db
    .select({ id: a.id, actorName: a.actorName, action: a.action, targetId: a.targetId, targetLabel: a.targetLabel, data: a.data, createdAt: a.createdAt })
    .from(a)
    .orderBy(desc(a.createdAt), desc(a.id))
    .limit(PAGE_SIZE)
    .offset((p - 1) * PAGE_SIZE);
  return { items, total, page: p, pageSize: PAGE_SIZE };
}
export type AuditRow = Awaited<ReturnType<typeof listAudit>>["items"][number];
