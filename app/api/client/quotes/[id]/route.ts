import { z } from "zod";
import { fail, isResponse, json, requireRole } from "@/lib/api";
import { getClientQuote } from "@/lib/workflow";

export async function GET(_: Request, { params }: RouteContext<"/api/client/quotes/[id]">) {
  const user = await requireRole("client");
  if (isResponse(user)) return user;
  const { id } = await params;
  const q = z.uuid().safeParse(id).success ? await getClientQuote(user.id, id) : null;
  return q ? json(q) : fail(404, "not_found");
}
