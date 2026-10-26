import { fail, json } from "@/lib/api";
import { createSession, hashPassword } from "@/lib/auth";
import { createUser, findUserByEmail } from "@/lib/repo";

// Connexion en un clic au compte client déjà rempli par `npm run seed:demo` (devis, messages, avis) ; à défaut, compte de test vide. Jamais en production.
const SEEDED = "lalao@client.mg";
const EMAIL = "client.demo@alumg.local";

export async function POST() {
  if (process.env.NODE_ENV === "production") return fail(404, "not_found");
  const id = (await findUserByEmail(SEEDED))?.id ?? (await findUserByEmail(EMAIL))?.id ?? (await createUser(EMAIL, "Client Démo", await hashPassword("motdepasse123"), "client", "034 00 000 00"));
  if (!id) return fail(500, "demo_failed");
  await createSession(id);
  return json({ id, role: "client" });
}
