import { z } from "zod";
import { fail, isResponse, json, parseBody, requireUser } from "@/lib/api";
import { actionSchema, applyAction } from "@/lib/workflow";

// Toutes les étapes d'un devis lié à un client : envoyer, accepter, demander une modification, avancer le chantier, évaluer, signaler…
// Le rôle (menuisier ou client) vient du devis lui-même, jamais du corps de la requête.
export async function POST(req: Request, { params }: RouteContext<"/api/quotes/[id]/actions">) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return fail(404, "not_found");
  const p = await parseBody(req, actionSchema);
  if ("res" in p) return p.res;
  const r = await applyAction(user.id, id, p.data);
  if (r.ok) return json(r.quote);
  return fail(r.error === "not_found" ? 404 : 409, r.error);
}
