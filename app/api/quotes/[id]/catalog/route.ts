import { z } from "zod";
import { fail, isResponse, json, parseBody, requireRole } from "@/lib/api";
import { marketSchema } from "@/lib/model";
import { deleteQuoteCatalog, getQuoteCatalog, saveQuoteCatalog } from "@/lib/repo";

type Ctx = RouteContext<"/api/quotes/[id]/catalog">;
const uuid = z.uuid();

// Catalogue des fournisseurs propre à ce devis : { market: null } tant que le devis suit le catalogue général.
export async function GET(_: Request, { params }: Ctx) {
  const user = await requireRole("menuisier");
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!uuid.safeParse(id).success) return fail(404, "not_found");
  return json({ market: await getQuoteCatalog(user.id, id) });
}

export async function PUT(req: Request, { params }: Ctx) {
  const user = await requireRole("menuisier");
  if (isResponse(user)) return user;
  const { id } = await params;
  const p = await parseBody(req, marketSchema);
  if ("res" in p) return p.res;
  if (!uuid.safeParse(id).success || !(await saveQuoteCatalog(user.id, id, p.data))) return fail(404, "not_found");
  return json({ market: p.data });
}

// Revient au catalogue général.
export async function DELETE(_: Request, { params }: Ctx) {
  const user = await requireRole("menuisier");
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!uuid.safeParse(id).success) return fail(404, "not_found");
  await deleteQuoteCatalog(user.id, id);
  return json({ market: null });
}
