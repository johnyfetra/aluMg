import { json } from "@/lib/api";
import { listPublicWorks } from "@/lib/profiles";

// Public : réalisations des menuisiers publiés, filtrables par catégorie, chantier et ville.
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  return json(await listPublicWorks({ category: u.get("category")?.slice(0, 40) || undefined, project: u.get("project")?.slice(0, 100) || undefined, city: u.get("city")?.slice(0, 80) || undefined }));
}
