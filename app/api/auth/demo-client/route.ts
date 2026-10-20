import { fail, json } from "@/lib/api";
import { createSession, hashPassword } from "@/lib/auth";
import { createUser, findUserByEmail } from "@/lib/repo";

// Compte client de test, créé au besoin puis connecté en un clic depuis la page de connexion. Jamais en production.
const EMAIL = "client.demo@alumg.local";

export async function POST() {
  if (process.env.NODE_ENV === "production") return fail(404, "not_found");
  const id = (await findUserByEmail(EMAIL))?.id ?? (await createUser(EMAIL, "Client Démo", await hashPassword("motdepasse123"), "client", "034 00 000 00"));
  if (!id) return fail(500, "demo_failed");
  await createSession(id);
  return json({ id, role: "client" });
}
