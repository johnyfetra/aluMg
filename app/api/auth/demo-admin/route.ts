import { fail, json } from "@/lib/api";
import { createSession, hashPassword } from "@/lib/auth";
import { createUser, findUserByEmail } from "@/lib/repo";

// Connexion en un clic au super admin local (admin@alumg.local), créé au premier appel. Jamais en production, et jamais sur une base distante :
// avec DATABASE_URL / POSTGRES_URL (ex. `npm run dev:remote`) la route répond 404, pour ne pas créer un administrateur à mot de passe connu sur de vraies données.
const EMAIL = "admin@alumg.local";

export async function POST() {
  if (process.env.NODE_ENV === "production" || process.env.DATABASE_URL || process.env.POSTGRES_URL) return fail(404, "not_found");
  const found = await findUserByEmail(EMAIL);
  if (found && found.role !== "admin") return fail(409, "demo_failed"); // cet e-mail est pris par un compte ordinaire : on ne le promeut pas
  const id = found?.id ?? (await createUser(EMAIL, "Administrateur", await hashPassword("motdepasse123"), "admin", "", { verified: true }));
  if (!id) return fail(500, "demo_failed");
  await createSession(id);
  return json({ id, role: "admin" });
}
