/**
 * Crée (ou réinitialise) un compte administrateur et affiche ses identifiants UNE SEULE FOIS.
 *
 *   npm run admin:create                                   -> admin@alumg.local + mot de passe généré
 *   npm run admin:create -- --email moi@exemple.mg --name "Mon nom"
 *   npm run admin:create -- --password "MotDePasseChoisi"  -> impose le mot de passe
 *
 * Base visée : DATABASE_URL si défini (production), sinon la base locale .data/pglite.
 * En local, arrêtez d'abord `npm run dev` par précaution : la base embarquée est prévue pour un seul processus.
 */
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { isProtected } from "../lib/admin";
import { getDb, schema } from "../lib/db";
import { hashPassword } from "../lib/password";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const email = (arg("email") ?? "admin@alumg.local").trim().toLowerCase();
const name = arg("name") ?? "Administrateur";
const generated = !arg("password");
const password = arg("password") ?? randomBytes(15).toString("base64url"); // 20 caractères

if (isProtected(email)) {
  console.error("Ce compte est protégé : il ne se crée ni ne se réinitialise par script.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("Le mot de passe doit contenir au moins 8 caractères.");
  process.exit(1);
}

async function main() {
  const db = await getDb();
  const passwordHash = await hashPassword(password);
  const [existing] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email));

  // e-mail tenu pour vérifié (sinon l'API répond « unverified ») ; une suspension est levée et les sessions ouvertes coupées
  const set = { passwordHash, role: "admin" as const, name, emailVerifiedAt: new Date(), suspendedAt: null };
  if (existing) {
    await db.update(schema.users).set(set).where(eq(schema.users.id, existing.id));
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, existing.id));
  } else {
    const [u] = await db.insert(schema.users).values({ email, ...set }).returning({ id: schema.users.id });
    await db.insert(schema.settings).values({ userId: u.id }).onConflictDoNothing();
  }

  console.log(`\n  Compte administrateur ${existing ? "réinitialisé" : "créé"}\n`);
  console.log(`  E-mail       : ${email}`);
  console.log(`  Mot de passe : ${password}${generated ? "   (généré, notez-le maintenant : il ne sera plus affiché)" : ""}\n`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
