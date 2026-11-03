import { z } from "zod";
import { fail, isResponse, json, limited, parseBody, requireAdmin } from "@/lib/api";
import { createAccount, FAIL_STATUS, listUsers, MAX_PAGE } from "@/lib/admin";
import { ROLES } from "@/lib/model";
import { normalizePhone } from "@/lib/phone";

const filter = z.object({
  q: z.string().trim().max(80).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(["active", "suspended"]).optional(),
  verified: z.enum(["yes", "no"]).optional(),
  page: z.coerce.number().int().min(1).max(MAX_PAGE).optional(),
});

export async function GET(req: Request) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const f = filter.safeParse(Object.fromEntries([...new URL(req.url).searchParams].filter(([, v]) => v)));
  return f.success ? json(await listUsers(f.data)) : fail(400, "invalid_query");
}

// Un compte se connecte par e-mail ou par téléphone : l'un des deux au moins.
const body = z
  .object({
    role: z.enum(ROLES),
    name: z.string().trim().min(1).max(80),
    email: z.union([z.literal(""), z.email().max(160)]).default(""),
    phone: z.union([z.literal(""), z.string().trim().regex(/^\+?[0-9][0-9 ().-]{5,22}$/).refine((p) => normalizePhone(p) !== null, "invalid_phone")]).default(""),
  })
  .refine((b) => b.email || b.phone, "email_or_phone");

export async function POST(req: Request) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const blocked = await limited({ key: `admin:create:${user.id}`, limit: 30, windowSec: 3600 });
  if (blocked) return blocked;
  const p = await parseBody(req, body);
  if ("res" in p) return p.res;
  const r = await createAccount(user, p.data);
  return "error" in r ? fail(FAIL_STATUS[r.error], r.error) : json(r, 201);
}
