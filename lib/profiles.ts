import { imageSrc } from "./logo";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
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
  zones: z.array(text(60).min(1)).max(10),
  sinceYear: z.number().int().min(1950).max(2100).nullable(),
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
  project: text(100),
  city: text(80),
  before: image.or(z.literal("")),
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
export type DirectoryFilter = { q?: string; city?: string; specialty?: string; minRating?: number; verified?: boolean; sort?: "rating" | "recent" | "name" | "completed" };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// shortcut: filtre et tri en mémoire sur les profils publiés (suffisant pour quelques centaines de menuisiers) ; passer en SQL paginé ensuite.
export async function listPublicMenuisiers(f: DirectoryFilter = {}): Promise<DirectoryEntry[]> {
  const db = await getDb();
  const profiles = await db.select().from(schema.menuisierProfiles).where(eq(schema.menuisierProfiles.published, true));
  if (!profiles.length) return [];
  const owners = new Map((await db.select({ id: schema.users.id, name: schema.users.name, avatar: schema.users.avatar }).from(schema.users).where(inArray(schema.users.id, profiles.map((p) => p.userId)))).map((u) => [u.id, u]));
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
    slug: p.slug, name: p.displayName, city: p.city, zones: p.zones, sinceYear: p.sinceYear, bio: p.bio, specialties: p.specialties, logo: imageSrc(p.slug, "logo", p.logo), cover: imageSrc(p.slug, "cover", cover.get(p.userId) ?? ""),
    verified: p.verified, rating: Math.round((rating.get(p.userId)?.avg ?? 0) * 10) / 10, reviews: rating.get(p.userId)?.n ?? 0,
    completed: completed.get(p.userId) ?? 0, portfolio: count.get(p.userId) ?? 0, since: p.createdAt.toISOString(),
    owner: { name: (owners.get(p.userId)?.name ?? "").split(/\s+/)[0], photo: imageSrc(p.slug, "owner", owners.get(p.userId)?.avatar ?? "") },
  }));
  if (f.q) out = out.filter((e) => norm(`${e.name} ${e.bio} ${e.city}`).includes(norm(f.q!)));
  if (f.city) out = out.filter((e) => norm([e.city, ...e.zones].join(" ")).includes(norm(f.city!)));
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
  // photos servies par adresse (mises en cache) : le profil ne transporte plus de data URL
  const light = items.map((it) => ({ ...it, thumb: `/api/public/works/${it.id}/img`, before: it.before ? `/api/public/works/${it.id}/img?k=before` : "", images: it.images.map((_, n) => `/api/public/works/${it.id}/img?n=${n}`) }));
  // seul le prénom du client est affiché
  return { ...entry, items: light, reviewList: rv.map((r) => ({ rating: r.rating, comment: r.comment, at: r.at.toISOString(), client: (r.client ?? "").split(/\s+/)[0] })), distribution };
}

// Badge « Vérifié » : accordé ou retiré par l'équipe (rôle admin).
export async function setVerified(slug: string, verified: boolean) {
  const db = await getDb();
  const r = await db.update(schema.menuisierProfiles).set({ verified }).where(eq(schema.menuisierProfiles.slug, slug)).returning({ slug: schema.menuisierProfiles.slug });
  return r.length > 0;
}
