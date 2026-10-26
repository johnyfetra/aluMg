import { z } from "zod";
import { clientIp, fail, json, limited, parseBody } from "@/lib/api";
import { createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { needsRehash } from "@/lib/password";
import { setPasswordHash } from "@/lib/repo";
import { isVerified } from "@/lib/verify";
import { findUserByIdentifier } from "@/lib/repo";

// Identifiant : numéro de téléphone ou adresse e-mail (`email` reste accepté pour les anciens clients de l'API).
const body = z
  .object({ identifier: z.string().trim().min(3).max(160).optional(), email: z.string().trim().min(3).max(160).optional(), password: z.string().min(1).max(200) })
  .refine((b) => b.identifier || b.email, "identifier");
// Empreinte factice : on calcule toujours un hachage, pour ne pas révéler par le temps de réponse si le compte existe.
const dummy = hashPassword("dummy-password");

export async function POST(req: Request) {
  const p = await parseBody(req, body);
  if ("res" in p) return p.res;
  const identifier = (p.data.identifier ?? p.data.email)!.toLowerCase();
  // freins : par adresse IP (large) et par identifiant (serré) — contre le bourrage d'identifiants et la force brute ciblée
  const blocked = await limited({ key: `login:ip:${clientIp(req)}`, limit: 30, windowSec: 600 }, { key: `login:id:${identifier}`, limit: 8, windowSec: 600 });
  if (blocked) return blocked;
  const user = await findUserByIdentifier(identifier);
  const ok = await verifyPassword(p.data.password, user?.passwordHash ?? (await dummy));
  if (!user || !ok) return fail(401, "invalid_credentials");
  if (needsRehash(user.passwordHash)) await setPasswordHash(user.id, await hashPassword(p.data.password)); // paramètres de hachage renforcés
  await createSession(user.id);
  return json({ id: user.id, name: user.name, email: user.email ?? "", role: user.role, verified: isVerified(user) });
}
