import { z } from "zod";

// Politique de mot de passe : 8 à 200 caractères, ni trop courant, ni égal à l'identifiant. La vérification de fond reste côté serveur.
const COMMON = new Set([
  "motdepasse", "motdepasse1", "motdepasse12", "motdepasse123", "password", "password1", "password123", "passw0rd", "12345678", "123456789", "1234567890",
  "azerty123", "azertyuiop", "qwertyuiop", "qwerty123", "azerty12", "11111111", "00000000", "abcd1234", "iloveyou", "admin123", "bienvenue", "madagascar", "antananarivo", "aluminium", "menuisier",
]);
export const isCommonPassword = (p: string) => COMMON.has(p.toLowerCase().replace(/\s/g, ""));

export const passwordSchema = z
  .string()
  .min(8)
  .max(200)
  .refine((p) => !isCommonPassword(p), "common_password")
  .refine((p) => new Set(p).size > 2, "too_simple"); // « aaaaaaaa », « abababab »…
