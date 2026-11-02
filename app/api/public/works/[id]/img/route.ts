import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

// Vignette d'une réalisation d'un menuisier publié, servie avec cache (la galerie ne transporte pas les data URL).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 404 });
  const db = await getDb();
  const [r] = await db
    .select({ t: schema.portfolioItems.thumb })
    .from(schema.portfolioItems)
    .innerJoin(schema.menuisierProfiles, and(eq(schema.menuisierProfiles.userId, schema.portfolioItems.userId), eq(schema.menuisierProfiles.published, true)))
    .where(eq(schema.portfolioItems.id, id));
  const m = /^data:(image\/[a-z+.-]+);base64,([\s\S]+)$/.exec(r?.t ?? "");
  if (!m) return new Response(null, { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), { headers: { "Content-Type": m[1], "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } });
}
