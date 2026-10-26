import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { currentUser, type SessionUser } from "./auth";
import { rateLimit } from "./ratelimit";

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
export const fail = (status: number, error: string) => json({ error }, status);

// Renvoie l'utilisateur connecté, ou la réponse 401 à retourner telle quelle.
// Un compte dont le téléphone/e-mail n'est pas vérifié reçoit 403 « unverified » (sauf `unverified: true`, réservé aux routes de vérification).
export async function requireUser(opts: { unverified?: boolean } = {}): Promise<SessionUser | NextResponse> {
  const user = await currentUser();
  if (!user) return fail(401, "unauthorized");
  return user.verified || opts.unverified ? user : fail(403, "unverified");
}
// Utilisateur connecté ayant l'un des rôles demandés (403 sinon).
export async function requireRole(...roles: SessionUser["role"][]): Promise<SessionUser | NextResponse> {
  const user = await requireUser();
  if (isResponse(user)) return user;
  return roles.includes(user.role) ? user : fail(403, "forbidden");
}
export const isResponse = (x: unknown): x is NextResponse => x instanceof NextResponse;

// Taille maximale d'un corps de requête (octets) : 2 Mo par défaut (réglages avec logo et signature) ; la messagerie accepte plus (pièces jointes).
export const BODY_LIMIT = 2_000_000;
export const BODY_LIMIT_FILES = 6_000_000;

// Lit et valide le corps JSON d'une requête : 413 si trop gros, 400 si illisible ou non conforme au schéma.
export async function parseBody<T>(req: Request, schema: ZodType<T>, maxBytes = BODY_LIMIT): Promise<{ data: T } | { res: NextResponse }> {
  if (Number(req.headers.get("content-length") ?? 0) > maxBytes) return { res: fail(413, "payload_too_large") };
  let raw: unknown;
  try {
    const text = await req.text(); // lu en texte pour borner aussi les corps sans Content-Length (transfert par morceaux)
    if (text.length > maxBytes) return { res: fail(413, "payload_too_large") };
    raw = JSON.parse(text);
  } catch {
    return { res: fail(400, "invalid_json") };
  }
  const r = schema.safeParse(raw);
  return r.success ? { data: r.data } : { res: json({ error: "invalid_body", issues: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, 400) };
}

// Adresse du client : premier saut de X-Forwarded-For (derrière le proxy de l'hébergeur), sinon X-Real-IP.
// shortcut: on fait confiance à ces en-têtes (déploiement derrière un proxy de confiance) ; à restreindre si l'app est exposée en direct.
export const clientIp = (req: Request) => (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim().slice(0, 64);

// Applique des limites de débit ; renvoie la réponse 429 à retourner telle quelle, ou null si tout va bien.
export async function limited(...rules: { key: string; limit: number; windowSec: number }[]): Promise<NextResponse | null> {
  for (const r of rules) {
    const res = await rateLimit(r.key, r.limit, r.windowSec);
    if (!res.ok) return NextResponse.json({ error: "too_many_requests" }, { status: 429, headers: { "Retry-After": String(res.retryAfter) } });
  }
  return null;
}
