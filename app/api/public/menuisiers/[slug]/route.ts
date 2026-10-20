import { fail, json } from "@/lib/api";
import { getPublicMenuisier } from "@/lib/profiles";

export async function GET(_: Request, { params }: RouteContext<"/api/public/menuisiers/[slug]">) {
  const { slug } = await params;
  const m = await getPublicMenuisier(slug.slice(0, 80));
  return m ? json(m) : fail(404, "not_found");
}
