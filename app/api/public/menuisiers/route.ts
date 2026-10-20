import { json } from "@/lib/api";
import { type DirectoryFilter, listPublicMenuisiers } from "@/lib/profiles";

// Public : aucun compte nécessaire. Ne renvoie jamais de coordonnées (téléphone, e-mail).
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  const sort = u.get("sort");
  const f: DirectoryFilter = {
    q: u.get("q")?.slice(0, 80) || undefined,
    city: u.get("city")?.slice(0, 80) || undefined,
    specialty: u.get("specialty")?.slice(0, 40) || undefined,
    minRating: Number(u.get("minRating")) || undefined,
    verified: u.get("verified") === "1",
    sort: sort === "recent" || sort === "name" || sort === "completed" ? sort : "rating",
  };
  return json(await listPublicMenuisiers(f));
}
