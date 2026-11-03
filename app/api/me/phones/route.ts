import { z } from "zod";
import { clientIp, fail, isResponse, json, limited, parseBody, requireUser } from "@/lib/api";
import { isPhone } from "@/lib/phone";
import { addPhone, listPhones } from "@/lib/phones";
import { sendPhoneCode, verificationRequired } from "@/lib/verify";

// Numéros du compte : le principal (donné à l'inscription) et les supplémentaires.
export async function GET() {
  const user = await requireUser();
  return isResponse(user) ? user : json(await listPhones(user.id));
}

const body = z.object({ phone: z.string().trim().refine(isPhone, "invalid_phone"), label: z.string().trim().max(40).default(""), lang: z.enum(["fr", "en", "mg"]).default("fr") });
const STATUS = { not_found: 404, channel_unavailable: 400, no_target: 400, cooldown: 429, send_failed: 502, already_verified: 409, invalid_phone: 400, phone_taken: 409, limit: 409 } as const;

// Étape 1 d'un ajout : un code est envoyé par SMS au numéro à ajouter (il n'est rattaché au compte qu'à la confirmation).
// Tant que la vérification n'est pas exigée (voir lib/verify.ts), le numéro est ajouté directement : `{ added: true }`.
export async function POST(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const blocked = await limited({ key: `phone-add:${user.id}`, limit: 8, windowSec: 3600 }, { key: `phone-add:ip:${clientIp(req)}`, limit: 30, windowSec: 3600 });
  if (blocked) return blocked;
  const p = await parseBody(req, body);
  if ("res" in p) return p.res;
  if (!verificationRequired()) {
    const added = await addPhone(user.id, p.data.phone, p.data.label);
    return added.ok ? json({ added: true }, 201) : fail(STATUS[added.error], added.error);
  }
  const r = await sendPhoneCode(user.id, p.data.phone, p.data.lang);
  if (r.ok) return json(r);
  const res = fail(STATUS[r.error], r.error);
  if ("retryAfter" in r && r.retryAfter) res.headers.set("Retry-After", String(r.retryAfter));
  return res;
}
