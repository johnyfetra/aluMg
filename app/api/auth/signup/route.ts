import { z } from "zod";
import { fail, json, parseBody } from "@/lib/api";
import { createSession, hashPassword } from "@/lib/auth";
import { createUser } from "@/lib/repo";

const body = z.object({ name: z.string().trim().min(1).max(80), email: z.email().max(160), password: z.string().min(8).max(200) });

export async function POST(req: Request) {
  const p = await parseBody(req, body);
  if ("res" in p) return p.res;
  const id = await createUser(p.data.email, p.data.name, await hashPassword(p.data.password));
  if (!id) return fail(409, "email_taken");
  await createSession(id);
  return json({ id, name: p.data.name, email: p.data.email.toLowerCase() }, 201);
}
