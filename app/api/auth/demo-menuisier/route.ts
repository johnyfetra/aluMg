import { fail, json } from "@/lib/api";
import { createSession, hashPassword } from "@/lib/auth";
import { createUser, findUserByEmail } from "@/lib/repo";

// Connexion en un clic au menuisier « Alu Mada » (test@alumada.mg), déjà rempli par `npm run seed:demo` (devis, messages, avis) ; à défaut, le compte est créé vide, avec le
// même numéro que le jeu de démonstration. Jamais en production.
const EMAIL = "test@alumada.mg";

export async function POST() {
  if (process.env.NODE_ENV === "production") return fail(404, "not_found");
  const hash = async () => hashPassword("motdepasse123");
  // numéro déjà pris par un autre compte : on crée le compte sans numéro plutôt que de bloquer l'accès rapide
  const id = (await findUserByEmail(EMAIL))?.id ?? (await createUser(EMAIL, "Alu Mada", await hash(), "menuisier", "034 12 345 67", { verified: true })) ?? (await createUser(EMAIL, "Alu Mada", await hash(), "menuisier", "", { verified: true }));
  if (!id) return fail(500, "demo_failed");
  await createSession(id);
  return json({ id, role: "menuisier" });
}
