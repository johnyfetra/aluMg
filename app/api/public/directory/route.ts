import { json, PUBLIC_CACHE } from "@/lib/api";
import { getDirectorySummary } from "@/lib/profiles";

// Public : chiffres de l'annuaire (total, villes, spécialités, réalisations, chantiers terminés), sans télécharger les profils.
export async function GET() {
  return json(await getDirectorySummary(), 200, PUBLIC_CACHE);
}
