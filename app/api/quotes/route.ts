import { fail, isResponse, json, parseBody, requireRole } from "@/lib/api";
import { hasAccess } from "@/lib/billing";
import { quoteSchema } from "@/lib/model";
import { createQuote, listQuotes } from "@/lib/repo";

export async function GET() {
  const user = await requireRole("menuisier");
  return isResponse(user) ? user : json(await listQuotes(user.id));
}

export async function POST(req: Request) {
  const user = await requireRole("menuisier");
  if (isResponse(user)) return user;
  if (!(await hasAccess(user.id))) return fail(402, "subscription_required"); // abonnement échu : les devis existants restent lisibles et modifiables
  const p = await parseBody(req, quoteSchema);
  if ("res" in p) return p.res;
  try {
    return json(await createQuote(user.id, p.data), 201);
  } catch {
    return fail(409, "conflict"); // identifiant déjà pris
  }
}
