import { z } from "zod";
import { fail, json, parseBody } from "@/lib/api";
import { createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { findUserByEmail } from "@/lib/repo";

const body = z.object({ email: z.email().max(160), password: z.string().min(1).max(200) });
// Empreinte factice : on calcule toujours un hachage, pour ne pas révéler par le temps de réponse si l'e-mail existe.
const dummy = hashPassword("dummy-password");

// shortcut: pas de limitation de tentatives, à ajouter (par IP et par e-mail) avant l'ouverture au public.
export async function POST(req: Request) {
  const p = await parseBody(req, body);
  if ("res" in p) return p.res;
  const user = await findUserByEmail(p.data.email);
  const ok = await verifyPassword(p.data.password, user?.passwordHash ?? (await dummy));
  if (!user || !ok) return fail(401, "invalid_credentials");
  await createSession(user.id);
  return json({ id: user.id, name: user.name, email: user.email, role: user.role });
}
