import { json, PUBLIC_CACHE } from "@/lib/api";
import { listPublicSocial } from "@/lib/socials";

// Public : réseaux sociaux de la plateforme (liens visibles), pour le pied de page du site.
export async function GET() {
  return json(await listPublicSocial(), 200, PUBLIC_CACHE);
}
