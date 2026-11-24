import { fail, isResponse, json, limited, parseBody, requireRole } from "@/lib/api";
import { declarePayment, declareSchema, subscriptionOf } from "@/lib/billing";

// Abonnement du menuisier connecté : état, numéros de paiement, paiements déclarés.
export async function GET() {
  const user = await requireRole("menuisier");
  return isResponse(user) ? user : json(await subscriptionOf(user.id));
}

// Déclarer un paiement (code de transfert) : vérifié ensuite à la main par l'équipe.
export async function POST(req: Request) {
  const user = await requireRole("menuisier");
  if (isResponse(user)) return user;
  const blocked = await limited({ key: `billing:${user.id}`, limit: 5, windowSec: 600 });
  if (blocked) return blocked;
  const p = await parseBody(req, declareSchema);
  if ("res" in p) return p.res;
  const r = await declarePayment(user, p.data);
  return "error" in r ? fail(r.error === "duplicate" ? 409 : 429, r.error) : json(await subscriptionOf(user.id), 201);
}
