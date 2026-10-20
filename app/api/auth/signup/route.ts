import { z } from "zod";
import { fail, json, parseBody } from "@/lib/api";
import { createSession, hashPassword } from "@/lib/auth";
import { createUser } from "@/lib/repo";

// Contact obligatoire pour les deux types de compte : e-mail (identifiant de connexion) et téléphone.
export const PHONE = /^\+?[0-9][0-9 ().-]{5,22}$/;
const body = z.object({
  role: z.enum(["client", "menuisier"]),
  name: z.string().trim().min(1).max(80),
  email: z.email().max(160),
  phone: z.string().trim().regex(PHONE),
  password: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  const p = await parseBody(req, body);
  if ("res" in p) return p.res;
  const id = await createUser(p.data.email, p.data.name, await hashPassword(p.data.password), p.data.role, p.data.phone);
  if (!id) return fail(409, "email_taken");
  await createSession(id);
  return json({ id, name: p.data.name, email: p.data.email.toLowerCase(), role: p.data.role }, 201);
}
