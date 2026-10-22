// Pièces jointes de la messagerie : limites et types acceptés. Partagé par le serveur (validation) et le navigateur (tri avant l'envoi).
// Envoyées en base64 dans le JSON : Vercel limite le corps d'une requête à 4,5 Mo.
export const ATTACH = { maxFiles: 6, maxFile: 3_000_000, maxTotal: 3_500_000 } as const;
export const ATTACH_MIME: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"], "image/webp": ["webp"], "image/gif": ["gif"],
  "application/pdf": ["pdf"],
  "application/msword": ["doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.ms-excel": ["xls"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "text/plain": ["txt"], "text/csv": ["csv"],
};
export const isImageMime = (m: string) => m.startsWith("image/");
// Type d'un fichier d'après son extension (les navigateurs laissent parfois le type vide).
export const mimeOfName = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return Object.entries(ATTACH_MIME).find(([, exts]) => exts.includes(ext))?.[0] ?? "";
};
export const sizeLabel = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(n / 1000))} Ko`);
