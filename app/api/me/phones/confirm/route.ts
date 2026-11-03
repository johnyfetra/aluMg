import { z } from "zod";
import { json, isResponse, limited, parseBody, requireUser } from "@/lib/api";
import { listPhones } from "@/lib/phones";
import { confirmPhoneCode } from "@/lib/verify";

const body = z.object({ code: z.string().trim().regex(/^\d{3}\s?\d{3}$/), label: z.string().trim().max(40).default("") });
const STATUS = { wrong_code: 422, locked: 429, no_pending: 410, phone_taken: 409, limit: 409, invalid_phone: 400 } as const;

// Étape 2 : le code reçu confirme le numéro, qui rejoint alors le compte.
export async function POST(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const blocked = await limited({ key: `phone-confirm:${user.id}`, limit: 30, windowSec: 3600 });
  if (blocked) return blocked;
  const p = await parseBody(req, body);
  if ("res" in p) return p.res;
  const r = await confirmPhoneCode(user.id, p.data.code, p.data.label);
  if (r.ok) return json(await listPhones(user.id), 201);
  return json({ error: r.error, ...("attemptsLeft" in r && r.attemptsLeft !== undefined ? { attemptsLeft: r.attemptsLeft } : {}) }, STATUS[r.error]);
}
