import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

// Photo d'une réalisation d'un menuisier publié, servie avec cache : ?n=2 (photo n°3), ?k=before (photo « avant »), sinon la vignette.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 404 });
  const u = new URL(req.url).searchParams;
  const db = await getDb();
  const [r] = await db
    .select({ thumb: schema.portfolioItems.thumb, before: schema.portfolioItems.before, images: schema.portfolioItems.images })
    .from(schema.portfolioItems)
    .innerJoin(schema.menuisierProfiles, and(eq(schema.menuisierProfiles.userId, schema.portfolioItems.userId), eq(schema.menuisierProfiles.published, true)))
    .where(eq(schema.portfolioItems.id, id));
  const n = Number(u.get("n"));
  const data = !r ? "" : u.get("k") === "before" ? r.before : u.has("n") && Number.isInteger(n) ? (r.images[n] ?? "") : r.thumb;
  const m = /^data:(image\/[a-z+.-]+);base64,([\s\S]+)$/.exec(data);
  if (!m) return new Response(null, { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), { headers: { "Content-Type": m[1], "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } });
}
