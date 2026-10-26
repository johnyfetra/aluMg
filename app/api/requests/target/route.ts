import { fail, isResponse, json, requireRole } from "@/lib/api";
import { getRequestTarget } from "@/lib/profiles";

// Le menuisier visé par un lien de demande (nom et logo seulement, jamais de coordonnées).
export async function GET(req: Request) {
  const user = await requireRole("client");
  if (isResponse(user)) return user;
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  const m = await getRequestTarget(slug.slice(0, 80));
  return m ? json(m) : fail(404, "not_found");
}
