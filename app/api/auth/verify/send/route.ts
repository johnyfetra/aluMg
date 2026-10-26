import { z } from "zod";
import { clientIp, fail, isResponse, json, limited, parseBody, requireUser } from "@/lib/api";
import { CHANNELS, sendCode } from "@/lib/verify";

const body = z.object({ channel: z.enum(CHANNELS), lang: z.enum(["fr", "en", "mg"]).default("fr") });
const STATUS = { not_found: 404, channel_unavailable: 400, no_target: 400, cooldown: 429, send_failed: 502, already_verified: 409 } as const;

// Envoie un code de vérification par SMS, appel vocal ou e-mail.
export async function POST(req: Request) {
  const user = await requireUser({ unverified: true });
  if (isResponse(user)) return user;
  // freins : par compte (coût des SMS/appels) et par adresse IP
  const blocked = await limited({ key: `verify-send:${user.id}`, limit: 8, windowSec: 3600 }, { key: `verify-send:ip:${clientIp(req)}`, limit: 30, windowSec: 3600 });
  if (blocked) return blocked;
  const p = await parseBody(req, body);
  if ("res" in p) return p.res;
  const r = await sendCode(user.id, p.data.channel, p.data.lang);
  if (r.ok) return json(r);
  const res = fail(STATUS[r.error], r.error);
  if (r.retryAfter) res.headers.set("Retry-After", String(r.retryAfter));
  return res;
}
