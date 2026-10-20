import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "./db";
import { SPECIALTIES } from "./model";
import { getSettings } from "./repo";

export { SPECIALTIES };

// ---------- Profil public du menuisier ----------

const text = (n: number) => z.string().trim().max(n);
const image = z.string().max(700_000).refine((s) => s.startsWith("data:image/"), "image");

export const profileSchema = z.object({
  displayName: text(120).min(1),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).min(3).max(60).optional(),
  city: text(80),
  bio: text(1500),
  specialties: z.array(z.enum(SPECIALTIES)).max(SPECIALTIES.length),
  logo: image.or(z.literal("")),
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
  displayName: r.displayName, slug: r.slug, city: r.city, bio: r.bio, logo: r.logo, published: r.published, verified: r.verified,
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
    .set({ displayName: input.displayName, slug, city: input.city, bio: input.bio, specialties: input.specialties, logo: input.logo, published: input.published })
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
  images: z.array(image).min(1).max(8),
  thumb: image.max(120_000),
});
export type PortfolioInput = z.infer<typeof portfolioSchema>;
export type PortfolioItem = PortfolioInput & { id: string };

const toItem = (r: typeof schema.portfolioItems.$inferSelect): PortfolioItem => ({ id: r.id, title: r.title, description: r.description, category: (r.category as PortfolioItem["category"]) ?? "", year: r.year, images: r.images, thumb: r.thumb });

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

// ---------- Annuaire public ----------
export type DirectoryEntry = {
  slug: string; name: string; city: string; bio: string; specialties: string[]; logo: string; cover: string;
  verified: boolean; rating: number; reviews: number; completed: number; portfolio: number; since: string;
};
export type DirectoryFilter = { q?: string; city?: string; specialty?: string; minRating?: number; verified?: boolean; sort?: "rating" | "recent" | "name" | "completed" };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// shortcut: filtre et tri en mémoire sur les profils publiés (suffisant pour quelques centaines de menuisiers) ; passer en SQL paginé ensuite.
export async function listPublicMenuisiers(f: DirectoryFilter = {}): Promise<DirectoryEntry[]> {
  const db = await getDb();
  const profiles = await db.select().from(schema.menuisierProfiles).where(eq(schema.menuisierProfiles.published, true));
  if (!profiles.length) return [];
  const ids = profiles.map((p) => p.userId);
  const [rv, done, items] = await Promise.all([
    db.select({ id: schema.reviews.menuisierId, avg: sql<number>`avg(${schema.reviews.rating})::float`, n: sql<number>`count(*)::int` }).from(schema.reviews).where(inArray(schema.reviews.menuisierId, ids)).groupBy(schema.reviews.menuisierId),
    db.select({ id: schema.quotes.userId, n: sql<number>`count(*)::int` }).from(schema.quotes).where(and(inArray(schema.quotes.userId, ids), eq(schema.quotes.status, "completed"))).groupBy(schema.quotes.userId),
    db.select({ userId: schema.portfolioItems.userId, thumb: schema.portfolioItems.thumb, at: schema.portfolioItems.createdAt }).from(schema.portfolioItems).where(inArray(schema.portfolioItems.userId, ids)).orderBy(desc(schema.portfolioItems.createdAt)),
  ]);
  const rating = new Map(rv.map((r) => [r.id, r]));
  const completed = new Map(done.map((r) => [r.id, r.n]));
  const cover = new Map<string, string>();
  const count = new Map<string, number>();
  for (const it of items) {
    if (!cover.has(it.userId) && it.thumb) cover.set(it.userId, it.thumb);
    count.set(it.userId, (count.get(it.userId) ?? 0) + 1);
  }

  let out: DirectoryEntry[] = profiles.map((p) => ({
    slug: p.slug, name: p.displayName, city: p.city, bio: p.bio, specialties: p.specialties, logo: p.logo, cover: cover.get(p.userId) ?? "",
    verified: p.verified, rating: Math.round((rating.get(p.userId)?.avg ?? 0) * 10) / 10, reviews: rating.get(p.userId)?.n ?? 0,
    completed: completed.get(p.userId) ?? 0, portfolio: count.get(p.userId) ?? 0, since: p.createdAt.toISOString(),
  }));
  if (f.q) out = out.filter((e) => norm(`${e.name} ${e.bio} ${e.city}`).includes(norm(f.q!)));
  if (f.city) out = out.filter((e) => norm(e.city).includes(norm(f.city!)));
  if (f.specialty) out = out.filter((e) => e.specialties.includes(f.specialty!));
  if (f.minRating) out = out.filter((e) => e.reviews > 0 && e.rating >= f.minRating!);
  if (f.verified) out = out.filter((e) => e.verified);
  const sort = f.sort ?? "rating";
  out.sort((a, b) =>
    sort === "name" ? a.name.localeCompare(b.name)
    : sort === "recent" ? b.since.localeCompare(a.since)
    : sort === "completed" ? b.completed - a.completed || b.rating - a.rating
    // meilleure note d'abord ; à note égale, plus d'avis ; sans avis en dernier
    : (b.reviews > 0 ? b.rating : -1) - (a.reviews > 0 ? a.rating : -1) || b.reviews - a.reviews || Number(b.verified) - Number(a.verified));
  return out;
}

export type PublicMenuisier = DirectoryEntry & {
  items: PortfolioItem[];
  reviewList: { rating: number; comment: string; client: string; at: string }[];
  distribution: number[]; // nombre d'avis pour 1 à 5 étoiles
};

export async function getPublicMenuisier(slug: string): Promise<PublicMenuisier | null> {
  const db = await getDb();
  const [p] = await db.select().from(schema.menuisierProfiles).where(and(eq(schema.menuisierProfiles.slug, slug), eq(schema.menuisierProfiles.published, true)));
  if (!p) return null;
  const entry = (await listPublicMenuisiers()).find((e) => e.slug === slug)!;
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
  // seul le prénom du client est affiché
  return { ...entry, items, reviewList: rv.map((r) => ({ rating: r.rating, comment: r.comment, at: r.at.toISOString(), client: (r.client ?? "").split(/\s+/)[0] })), distribution };
}
