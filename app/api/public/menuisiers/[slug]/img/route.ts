import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { ProfileImage } from "@/lib/logo";

// Image d'un profil (logo, première réalisation, photo du menuisier) servie avec cache : la même adresse sert tant que l'image ne change pas.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const kind = (new URL(req.url).searchParams.get("k") ?? "logo") as ProfileImage;
  const db = await getDb();
  const [p] = await db.select({ userId: schema.menuisierProfiles.userId, logo: schema.menuisierProfiles.logo }).from(schema.menuisierProfiles).where(eq(schema.menuisierProfiles.slug, slug.slice(0, 80)));
  if (!p) return new Response(null, { status: 404 });
  let data = "";
  if (kind === "logo") data = p.logo;
  else if (kind === "owner") data = (await db.select({ a: schema.users.avatar }).from(schema.users).where(eq(schema.users.id, p.userId)))[0]?.a ?? "";
  else if (kind === "cover") data = (await db.select({ t: schema.portfolioItems.thumb }).from(schema.portfolioItems).where(eq(schema.portfolioItems.userId, p.userId)).limit(1))[0]?.t ?? "";
  const m = /^data:(image\/[a-z+.-]+);base64,([\s\S]+)$/.exec(data);
  if (!m) return new Response(null, { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), { headers: { "Content-Type": m[1], "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } });
}
