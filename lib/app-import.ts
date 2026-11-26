import { z } from "zod";
import { hashPassword, verifyPassword } from "./auth";
import { quoteSchema, settingsSchema, withDefaults, type Settings } from "./model";
import { createQuote, findUserByIdentifier, listQuotes, saveSettings } from "./repo";

// Fin de l'essai de l'application locale : le menuisier se connecte à son compte depuis l'app et y envoie ce qu'il a fait hors ligne.
// Une seule requête (identifiant + mot de passe + données) : l'app n'a pas de session à garder.
export const importSchema = z.object({
  identifier: z.string().trim().min(3).max(160),
  password: z.string().min(1).max(200),
  settings: z.unknown().optional(),
  quotes: z.array(z.unknown()).max(500),
});

const dummy = hashPassword("dummy-password"); // même temps de réponse que le compte existe ou non (comme la connexion)

export async function appLogin(identifier: string, password: string) {
  const user = await findUserByIdentifier(identifier.toLowerCase());
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummy));
  if (!user || !ok) return "invalid_credentials" as const;
  if (user.suspendedAt) return "suspended" as const;
  if (user.role !== "menuisier") return "not_menuisier" as const;
  return user;
}

// Devis repris en brouillon, numérotés par le compte ; un devis déjà envoyé (même identifiant) est ignoré : renvoyer deux fois ne double rien.
// Les réglages (entreprise, prix, modèle) ne remplacent ceux du compte que s'il n'a encore aucun devis (compte neuf, jamais utilisé sur le site).
export async function importLocal(userId: string, settings: unknown, quotes: unknown[]) {
  const fresh = (await listQuotes(userId)).length === 0;
  let imported = 0;
  let skipped = 0;
  for (const raw of quotes) {
    const q = quoteSchema.safeParse(raw);
    if (!q.success) {
      skipped++;
      continue;
    }
    try {
      await createQuote(userId, { ...q.data, status: "draft" });
      imported++;
    } catch {
      skipped++;
    }
  }
  const s = settingsSchema.safeParse(settings);
  if (s.success && fresh) await saveSettings(userId, withDefaults(s.data as Partial<Settings>));
  return { imported, skipped, settings: s.success && fresh };
}
