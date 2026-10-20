import { fail, isResponse, json, parseBody, requireRole } from "@/lib/api";
import { createRequest, requestSchema } from "@/lib/workflow";

// Un client demande un devis à un menuisier de l'annuaire.
export async function POST(req: Request) {
  const user = await requireRole("client");
  if (isResponse(user)) return user;
  const p = await parseBody(req, requestSchema);
  if ("res" in p) return p.res;
  const r = await createRequest(user.id, p.data);
  if (r === "no_menuisier") return fail(404, "no_menuisier");
  if (r === "no_client") return fail(401, "unauthorized");
  return json(r, 201);
}
