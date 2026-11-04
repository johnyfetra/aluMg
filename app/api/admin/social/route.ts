import { fail, isResponse, json, parseBody, requireAdmin } from "@/lib/api";
import { socialSchema } from "@/lib/social";
import { createSocial, listSocial } from "@/lib/socials";

export async function GET() {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  return json(await listSocial());
}

export async function POST(req: Request) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const p = await parseBody(req, socialSchema);
  if ("res" in p) return p.res;
  const r = await createSocial({ id: user.id, name: user.name }, p.data);
  return "error" in r ? fail(400, r.error) : json(r, 201);
}
