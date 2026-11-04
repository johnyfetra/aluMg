import { z } from "zod";
import { fail, isResponse, json, requireAdmin } from "@/lib/api";
import { getAdminQuote } from "@/lib/admin";

export async function GET(_req: Request, { params }: RouteContext<"/api/admin/quotes/[id]">) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const { id } = await params;
  const q = z.uuid().safeParse(id).success ? await getAdminQuote(id) : null;
  return q ? json(q) : fail(404, "not_found");
}
