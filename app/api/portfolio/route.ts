import { isResponse, json, parseBody, requireRole } from "@/lib/api";
import { createPortfolioItem, listPortfolio, portfolioSchema } from "@/lib/profiles";

export async function GET() {
  const user = await requireRole("menuisier");
  return isResponse(user) ? user : json(await listPortfolio(user.id));
}

export async function POST(req: Request) {
  const user = await requireRole("menuisier");
  if (isResponse(user)) return user;
  const p = await parseBody(req, portfolioSchema);
  if ("res" in p) return p.res;
  return json(await createPortfolioItem(user.id, p.data), 201);
}
