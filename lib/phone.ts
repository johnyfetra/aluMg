// Numéros de téléphone : stockés sous forme normalisée internationale (+261…), pour l'unicité, la connexion et l'envoi des codes.
// Pays par défaut : Madagascar (+261) ; un « 0 » initial est le préfixe national (034 00 000 00 → +261340000000).
export const DEFAULT_COUNTRY = "261";

export function normalizePhone(raw: string): string | null {
  const s = raw.trim();
  const digits = s.replace(/\D/g, "");
  if (!digits) return null;
  const n = s.replace(/[^\d+]/g, "").startsWith("+") ? `+${digits}` : digits.startsWith("00") ? `+${digits.slice(2)}` : digits.startsWith("0") ? `+${DEFAULT_COUNTRY}${digits.slice(1)}` : `+${digits}`;
  // E.164 : 8 à 15 chiffres au total
  return /^\+\d{8,15}$/.test(n) ? n : null;
}

// « +261 34 •• ••• 44 » : pour dire à l'utilisateur où le code part, sans exposer le numéro entier.
export const maskPhone = (n: string) => `${n.slice(0, 4)} ${"•".repeat(Math.max(0, n.length - 6))}${n.slice(-2)}`;
export const maskEmail = (e: string) => {
  const [u, d] = e.split("@");
  return `${u.slice(0, 1)}${"•".repeat(Math.max(1, Math.min(6, u.length - 1)))}@${d}`;
};
