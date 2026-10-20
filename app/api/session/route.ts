import { json } from "@/lib/api";
import { currentUser } from "@/lib/auth";

// Sonde de session pour les pages publiques : toujours 200, renvoie null si personne n'est connecté (pas de 401 dans la console).
export async function GET() {
  return json((await currentUser()) ?? null);
}
