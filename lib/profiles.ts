import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "./db";
import { dataImage } from "./image-schema";
import { SPECIALTIES } from "./model";
import { getSettings } from "./repo";

export { SPECIALTIES };

// ---------- Profil public du menuisier ----------

const text = (n: number) => z.string().trim().max(n);
const image = dataImage(700_000).refine((s) => s !== "", "image");

export const profileSchema = z.object({
  displayName: text(120).min(1),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).min(3).max(60).optional(),
  city: text(80),
  bio: text(1500),
  specialties: z.array(z.enum(SPECIALTIES)).max(SPECIALTIES.length),
  logo: image.or(z.literal("")),
  zones: z.array(text(60).min(1)).max(10).default([]),
  sinceYear: z.number().int().min(1950).max(2100).nullable().default(null),
  published: z.boolean(),
});
export type ProfileInput = z.infer<typeof profileSchema>;
export type Profile = ProfileInput & { slug: string; verified: boolean };

export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "menuisier";

async function uniqueSlug(base: string, ownerId: string) {
  const db = await getDb();
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const [row] = await db.select({ userId: schema.menuisierProfiles.userId }).from(schema.menuisierProfiles).where(eq(schema.menuisierProfiles.slug, slug));
    if (!row || row.userId === ownerId) return slug;
  }
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

// Premier appel : crée un profil non publié à partir du nom de l'entreprise (réglages) ou du nom du compte.
export async function getOwnProfile(userId: string, accountName: string): Promise<Profile> {
  const db = await getDb();
  const [row] = await db.select().from(schema.menuisierProfiles).where(eq(schema.menuisierProfiles.userId, userId));
  if (row) return toProfile(row);
  const settings = await getSettings(userId);
  const displayName = settings.company || accountName;
  const [created] = await db
    .insert(schema.menuisierProfiles)
    .values({ userId, displayName, slug: await uniqueSlug(slugify(displayName), userId), logo: settings.logo.length < 200_000 ? settings.logo : "" })
    .returning();
  return toProfile(created);
}

const toProfile = (r: typeof schema.menuisierProfiles.$inferSelect): Profile => ({
  displayName: r.displayName, slug: r.slug, city: r.city, bio: r.bio, logo: r.logo, zones: r.zones, sinceYear: r.sinceYear, published: r.published, verified: r.verified,
  specialties: r.specialties.filter((s): s is (typeof SPECIALTIES)[number] => (SPECIALTIES as readonly string[]).includes(s)),
});

export async function saveOwnProfile(userId: string, accountName: string, input: ProfileInput): Promise<Profile | "incomplete"> {
  const current = await getOwnProfile(userId, accountName);
  // un profil n'est publié que s'il est assez complet pour être utile à un client
  if (input.published && (!input.city || !input.displayName)) return "incomplete";
  const slug = await uniqueSlug(input.slug ?? current.slug, userId);
  const db = await getDb();
  const [row] = await db
    .update(schema.menuisierProfiles)
    .set({ displayName: input.displayName, slug, city: input.city, bio: input.bio, specialties: input.specialties, logo: input.logo, zones: input.zones, sinceYear: input.sinceYear, published: input.published })
    .where(eq(schema.menuisierProfiles.userId, userId))
    .returning();
  return toProfile(row);
}

// ---------- Portfolio (réalisations) ----------
export const portfolioSchema = z.object({
  title: text(120).min(1),
  description: text(1500),
  category: z.enum(SPECIALTIES).or(z.literal("")),
  year: z.number().int().min(1990).max(2100).nullable(),
  project: text(100).default(""),
  city: text(80).default(""),
  before: image.or(z.literal("")).default(""),
  images: z.array(image).min(1).max(8),
  thumb: image.max(120_000),
});
export type PortfolioInput = z.infer<typeof portfolioSchema>;
export type PortfolioItem = PortfolioInput & { id: string };

const toItem = (r: typeof schema.portfolioItems.$inferSelect): PortfolioItem => ({ id: r.id, title: r.title, description: r.description, category: (r.category as PortfolioItem["category"]) ?? "", year: r.year, project: r.project, city: r.city, before: r.before, images: r.images, thumb: r.thumb });

export async function listPortfolio(userId: string): Promise<PortfolioItem[]> {
  const db = await getDb();
  return (await db.select().from(schema.portfolioItems).where(eq(schema.portfolioItems.userId, userId)).orderBy(desc(schema.portfolioItems.createdAt))).map(toItem);
}

export async function createPortfolioItem(userId: string, input: PortfolioInput) {
  const db = await getDb();
  const [row] = await db.insert(schema.portfolioItems).values({ userId, ...input }).returning();
  return toItem(row);
}

export async function updatePortfolioItem(userId: string, id: string, input: PortfolioInput) {
  const db = await getDb();
  const [row] = await db.update(schema.portfolioItems).set(input).where(and(eq(schema.portfolioItems.id, id), eq(schema.portfolioItems.userId, userId))).returning();
  return row ? toItem(row) : null;
}

export async function deletePortfolioItem(userId: string, id: string) {
  const db = await getDb();
  const r = await db.delete(schema.portfolioItems).where(and(eq(schema.portfolioItems.id, id), eq(schema.portfolioItems.userId, userId))).returning({ id: schema.portfolioItems.id });
  return r.length > 0;
}

// Réalisations de tous les menuisiers publiés, pour la galerie publique : vignettes seulement (les photos complètes restent sur le profil).
export type PublicWork = { id: string; title: string; description: string; category: string; project: string; city: string; year: number | null; photos: number; thumb: string; menuisier: { slug: string; name: string; verified: boolean } };
export async function listPublicWorks(f: { category?: string; project?: string; city?: string } = {}): Promise<PublicWork[]> {
  const db = await getDb();
  const rows = await db
    .select({ it: schema.portfolioItems, slug: schema.menuisierProfiles.slug, name: schema.menuisierProfiles.displayName, verified: schema.menuisierProfiles.verified, pcity: schema.menuisierProfiles.city, photos: sql<number>`jsonb_array_length(${schema.portfolioItems.images})::int` })
    .from(schema.portfolioItems)
    .innerJoin(schema.menuisierProfiles, and(eq(schema.menuisierProfiles.userId, schema.portfolioItems.userId), eq(schema.menuisierProfiles.published, true)))
    .orderBy(desc(schema.portfolioItems.createdAt))
    .limit(200);
  return rows
    .map((r) => ({ id: r.it.id, title: r.it.title, description: r.it.description, category: r.it.category, project: r.it.project, city: r.it.city || r.pcity, year: r.it.year, photos: r.photos, thumb: r.it.thumb ? `/api/public/works/${r.it.id}/img` : "", menuisier: { slug: r.slug, name: r.name, verified: r.verified } }))
    .filter((w) => (!f.category || w.category === f.category) && (!f.project || norm(w.project).includes(norm(f.project))) && (!f.city || norm(w.city).includes(norm(f.city))));
}

// ---------- Annuaire public ----------
export type DirectoryEntry = {
  slug: string; name: string; city: string; zones: string[]; sinceYear: number | null; bio: string; specialties: string[]; logo: string; cover: string;
  verified: boolean; rating: number; reviews: number; completed: number; portfolio: number; since: string;
  owner: { name: string; photo: string }; // interlocuteur : prénom et photo de profil (jamais de coordonnées)
};
export type DirectoryFilter = { q?: string; city?: string; specialty?: string; minRating?: number; verified?: boolean; slug?: string; sort?: "rating" | "recent" | "name" | "completed"; limit?: number; offset?: number };

export const DIRECTORY_PAGE_MAX = 100; // un client ne peut jamais réclamer tout l'annuaire d'un coup

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// Même pliage (minuscules, sans accents) côté SQL et côté JS : « Fenêtres » se trouve en tapant « fenetres ».
const fold = (col: unknown) => sql`translate(lower(${col}), 'àâäãåáéèêëíìîïóòôöõúùûüçñ', 'aaaaaaeeeeiiiiooooouuuucn')`;
const contains = (col: unknown, term: string) => sql`${fold(col)} like ${`%${norm(term).replace(/[\\%_]/g, "\\$&")}%`} escape '\\'`;
// Les images d'un profil (data URL) ne voyagent jamais dans une liste : seule leur longueur sert de clé de cache (voir lib/logo.ts).
const imgUrl = (slug: string, kind: "logo" | "cover" | "owner", isData: boolean, len: number, plain: string) => (isData && slug ? `/api/public/menuisiers/${encodeURIComponent(slug)}/img?k=${kind}&v=${len}` : plain);

// Filtre, tri et pagination en SQL : seule la page demandée quitte la base.
// shortcut: la recherche texte est un LIKE '%mot%' sur les profils publiés (rapide jusqu'à quelques dizaines de milliers) ; passer à pg_trgm (index GIN) au-delà.
export async function listPublicMenuisiers(f: DirectoryFilter = {}): Promise<DirectoryEntry[]> {
  const db = await getDb();
  const P = schema.menuisierProfiles;
  const U = schema.users;
  const rv = db.select({ id: schema.reviews.menuisierId, avg: sql<number>`avg(${schema.reviews.rating})::float`.as("rv_avg"), n: sql<number>`count(*)::int`.as("rv_n") }).from(schema.reviews).groupBy(schema.reviews.menuisierId).as("rv");
  const done = db.select({ id: schema.quotes.userId, n: sql<number>`count(*)::int`.as("done_n") }).from(schema.quotes).where(eq(schema.quotes.status, "completed")).groupBy(schema.quotes.userId).as("done");
  const works = db.select({ id: schema.portfolioItems.userId, n: sql<number>`count(*)::int`.as("works_n") }).from(schema.portfolioItems).groupBy(schema.portfolioItems.userId).as("works");
  const rating = sql<number>`coalesce(${rv.avg}, 0)`;
  const reviews = sql<number>`coalesce(${rv.n}, 0)`;
  const completed = sql<number>`coalesce(${done.n}, 0)`;
  const cover = sql<number | null>`(select length(${schema.portfolioItems.thumb}) from ${schema.portfolioItems} where ${schema.portfolioItems.userId} = ${P.userId} and ${schema.portfolioItems.thumb} <> '' order by ${schema.portfolioItems.createdAt} desc limit 1)`;

  const where = [
    eq(P.published, true),
    f.slug ? eq(P.slug, f.slug) : undefined,
    f.q ? or(contains(P.displayName, f.q), contains(P.bio, f.q), contains(P.city, f.q)) : undefined,
    f.city ? or(contains(P.city, f.city), contains(sql`${P.zones}::text`, f.city)) : undefined,
    f.specialty ? sql`${P.specialties} @> ${JSON.stringify([f.specialty])}::jsonb` : undefined,
    f.minRating ? sql`${reviews} > 0 and ${rating} >= ${f.minRating}` : undefined,
    f.verified ? eq(P.verified, true) : undefined,
  ];
  // meilleure note d'abord ; à note égale, plus d'avis ; sans avis en dernier ; l'adresse départage pour que les pages se suivent sans doublon
  const order =
    f.sort === "name" ? [sql`lower(${P.displayName})`]
    : f.sort === "recent" ? [desc(P.createdAt)]
    : f.sort === "completed" ? [desc(completed), desc(rating)]
    : [desc(sql`case when ${reviews} > 0 then round(${rating}::numeric, 1) else -1 end`), desc(reviews), desc(P.verified)];

  const rows = await db
    .select({
      slug: P.slug, name: P.displayName, city: P.city, zones: P.zones, sinceYear: P.sinceYear, bio: P.bio, specialties: P.specialties, verified: P.verified, since: P.createdAt,
      logoIsData: sql<boolean>`${P.logo} like 'data:%'`, logoLen: sql<number>`length(${P.logo})`, logoPlain: sql<string>`case when ${P.logo} like 'data:%' then '' else ${P.logo} end`,
      ownerName: U.name, ownerIsData: sql<boolean>`coalesce(${U.avatar}, '') like 'data:%'`, ownerLen: sql<number>`length(coalesce(${U.avatar}, ''))`, ownerPlain: sql<string>`case when coalesce(${U.avatar}, '') like 'data:%' then '' else coalesce(${U.avatar}, '') end`,
      rating, reviews, completed, portfolio: sql<number>`coalesce(${works.n}, 0)`, coverLen: cover,
    })
    .from(P)
    .innerJoin(U, eq(U.id, P.userId))
    .leftJoin(rv, eq(rv.id, P.userId))
    .leftJoin(done, eq(done.id, P.userId))
    .leftJoin(works, eq(works.id, P.userId))
    .where(and(...where))
    .orderBy(...order, asc(P.slug))
    .limit(Math.min(Math.max(1, f.limit ?? DIRECTORY_PAGE_MAX), DIRECTORY_PAGE_MAX))
    .offset(Math.max(0, f.offset ?? 0));

  return rows.map((r) => ({
    slug: r.slug, name: r.name, city: r.city, zones: r.zones, sinceYear: r.sinceYear, bio: r.bio, specialties: r.specialties,
    logo: imgUrl(r.slug, "logo", r.logoIsData, r.logoLen, r.logoPlain), cover: r.coverLen ? imgUrl(r.slug, "cover", true, r.coverLen, "") : "",
    verified: r.verified, rating: Math.round(r.rating * 10) / 10, reviews: r.reviews, completed: r.completed, portfolio: r.portfolio, since: r.since.toISOString(),
    owner: { name: (r.ownerName ?? "").split(/\s+/)[0], photo: imgUrl(r.slug, "owner", r.ownerIsData, r.ownerLen, r.ownerPlain) },
  }));
}

// Chiffres de l'annuaire (total, villes, spécialités, réalisations, chantiers terminés) calculés en SQL : les facettes des filtres et la bande de chiffres
// de l'accueil n'ont plus besoin de télécharger tous les profils.
export type DirectorySummary = { total: number; works: number; completed: number; cities: { city: string; n: number }[]; specialties: Record<string, number> };
export async function getDirectorySummary(): Promise<DirectorySummary> {
  const db = await getDb();
  const P = schema.menuisierProfiles;
  const published = eq(P.published, true);
  const bySpecialty = Object.fromEntries(SPECIALTIES.map((s) => [s, sql<number>`count(*) filter (where ${P.specialties} @> ${JSON.stringify([s])}::jsonb)::int`]));
  const [[head], cities, [w], [d]] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int`, ...bySpecialty }).from(P).where(published),
    db.select({ city: P.city, n: sql<number>`count(*)::int` }).from(P).where(and(published, sql`${P.city} <> ''`)).groupBy(P.city).orderBy(desc(sql`count(*)`), asc(P.city)).limit(50),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.portfolioItems).innerJoin(P, and(eq(P.userId, schema.portfolioItems.userId), published)),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.quotes).innerJoin(P, and(eq(P.userId, schema.quotes.userId), published)).where(eq(schema.quotes.status, "completed")),
  ]);
  const { total, ...specialties } = head;
  return { total, works: w.n, completed: d.n, cities, specialties };
}

export type PublicMenuisier = DirectoryEntry & {
  items: PortfolioItem[];
  reviewList: { rating: number; comment: string; client: string; at: string }[];
  distribution: number[]; // nombre d'avis pour 1 à 5 étoiles
};

// Menuisier désigné par un lien de demande, publié ou non : le lien du menuisier fait office d'invitation.
export async function getRequestTarget(slug: string): Promise<{ name: string; logo: string } | null> {
  const db = await getDb();
  const [p] = await db.select({ name: schema.menuisierProfiles.displayName, logo: schema.menuisierProfiles.logo }).from(schema.menuisierProfiles).where(eq(schema.menuisierProfiles.slug, slug));
  return p ?? null;
}

export async function getPublicMenuisier(slug: string): Promise<PublicMenuisier | null> {
  const db = await getDb();
  const [p] = await db.select().from(schema.menuisierProfiles).where(and(eq(schema.menuisierProfiles.slug, slug), eq(schema.menuisierProfiles.published, true)));
  if (!p) return null;
  const [entry] = await listPublicMenuisiers({ slug, limit: 1 });
  const [items, rv] = await Promise.all([
    listPortfolio(p.userId),
    db
      .select({ rating: schema.reviews.rating, comment: schema.reviews.comment, at: schema.reviews.createdAt, client: schema.users.name })
      .from(schema.reviews)
      .leftJoin(schema.users, eq(schema.users.id, schema.reviews.clientId))
      .where(eq(schema.reviews.menuisierId, p.userId))
      .orderBy(desc(schema.reviews.createdAt)),
  ]);
  const distribution = [1, 2, 3, 4, 5].map((n) => rv.filter((r) => r.rating === n).length);
  // photos servies par adresse (mises en cache) : le profil ne transporte plus de data URL
  const light = items.map((it) => ({ ...it, thumb: `/api/public/works/${it.id}/img`, before: it.before ? `/api/public/works/${it.id}/img?k=before` : "", images: it.images.map((_, n) => `/api/public/works/${it.id}/img?n=${n}`) }));
  // seul le prénom du client est affiché
  return { ...entry, items: light, reviewList: rv.map((r) => ({ rating: r.rating, comment: r.comment, at: r.at.toISOString(), client: (r.client ?? "").split(/\s+/)[0] })), distribution };
}
