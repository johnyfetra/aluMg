import { z } from "zod";
import { isResponse, json, limited, parseBody, requireUser } from "@/lib/api";
import { confirmCode } from "@/lib/verify";

const body = z.object({ code: z.string().trim().regex(/^\d{3}\s?\d{3}$/) });

// Confirme le code reçu : le compte est alors vérifié par ce canal.
export async function POST(req: Request) {
  const user = await requireUser({ unverified: true });
  if (isResponse(user)) return user;
  const blocked = await limited({ key: `verify-confirm:${user.id}`, limit: 30, windowSec: 3600 });
  if (blocked) return blocked;
  const p = await parseBody(req, body);
  if ("res" in p) return p.res;
  const r = await confirmCode(user.id, p.data.code);
  if (r.ok) return json({ verified: true, channel: r.channel });
  return json({ error: r.error, ...(r.attemptsLeft !== undefined ? { attemptsLeft: r.attemptsLeft } : {}) }, r.error === "wrong_code" ? 422 : r.error === "locked" ? 429 : 410);
}
