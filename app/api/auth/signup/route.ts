import { z } from "zod";
import { clientIp, fail, json, limited, parseBody } from "@/lib/api";
import { createSession, hashPassword } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { passwordSchema } from "@/lib/password-policy";
import { createUser, findUserByEmail, findUserByPhone } from "@/lib/repo";

// Contact : le téléphone est obligatoire (identifiant et canal de vérification) ; l'e-mail est facultatif.
export const PHONE = /^\+?[0-9][0-9 ().-]{5,22}$/;
const body = z.object({
  role: z.enum(["client", "menuisier"]),
  name: z.string().trim().min(1).max(80),
  email: z.union([z.literal(""), z.email().max(160)]).default(""),
  phone: z.string().trim().regex(PHONE).refine((p) => normalizePhone(p) !== null, "invalid_phone"),
  password: passwordSchema,
});

export async function POST(req: Request) {
  const blocked = await limited({ key: `signup:ip:${clientIp(req)}`, limit: 10, windowSec: 3600 });
  if (blocked) return blocked;
  const p = await parseBody(req, body);
  if ("res" in p) return p.res;
  // doublons : réponses distinctes pour que l'utilisateur sache quoi corriger (la limitation de débit freine l'énumération)
  if (p.data.email && (await findUserByEmail(p.data.email))) return fail(409, "email_taken");
  if (await findUserByPhone(p.data.phone)) return fail(409, "phone_taken");
  const id = await createUser(p.data.email, p.data.name, await hashPassword(p.data.password), p.data.role, p.data.phone);
  if (!id) return fail(409, "phone_taken"); // course : un autre compte vient de prendre l'e-mail ou le numéro
  await createSession(id);
  return json({ id, name: p.data.name, email: p.data.email.toLowerCase(), role: p.data.role, verified: false }, 201);
}
