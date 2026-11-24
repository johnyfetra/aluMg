import { z } from "zod";
import { fail, isResponse, json, parseBody, requireAdmin } from "@/lib/api";
import { reviewPayment, reviewSchema } from "@/lib/billing";

// Confirmer (l'argent est bien arrivé : l'abonnement est prolongé) ou refuser un paiement déclaré.
export async function PATCH(req: Request, { params }: RouteContext<"/api/admin/payments/[id]">) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return fail(404, "not_found");
  const p = await parseBody(req, reviewSchema);
  if ("res" in p) return p.res;
  const r = await reviewPayment(user, id, p.data.decision, p.data.note);
  return "error" in r ? fail(r.error === "not_found" ? 404 : 409, r.error) : json(r);
}
