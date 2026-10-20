import { z } from "zod";
import { fail, isResponse, json, parseBody, requireRole } from "@/lib/api";
import { deletePortfolioItem, portfolioSchema, updatePortfolioItem } from "@/lib/profiles";

type Ctx = RouteContext<"/api/portfolio/[id]">;
const uuid = z.uuid();

export async function PUT(req: Request, { params }: Ctx) {
  const user = await requireRole("menuisier");
  if (isResponse(user)) return user;
  const { id } = await params;
  const p = await parseBody(req, portfolioSchema);
  if ("res" in p) return p.res;
  const item = uuid.safeParse(id).success ? await updatePortfolioItem(user.id, id, p.data) : null;
  return item ? json(item) : fail(404, "not_found");
}

export async function DELETE(_: Request, { params }: Ctx) {
  const user = await requireRole("menuisier");
  if (isResponse(user)) return user;
  const { id } = await params;
  return uuid.safeParse(id).success && (await deletePortfolioItem(user.id, id)) ? json({ ok: true }) : fail(404, "not_found");
}
