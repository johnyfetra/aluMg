import { z } from "zod";
import { fail, isResponse, json, parseBody, requireUser } from "@/lib/api";
import { addLineComment, commentSchema, listLineComments } from "@/lib/workflow";

export async function GET(_req: Request, { params }: RouteContext<"/api/quotes/[id]/comments">) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return fail(404, "not_found");
  const list = await listLineComments(user.id, id);
  return list ? json(list) : fail(404, "not_found");
}

export async function POST(req: Request, { params }: RouteContext<"/api/quotes/[id]/comments">) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return fail(404, "not_found");
  const p = await parseBody(req, commentSchema);
  if ("res" in p) return p.res;
  const r = await addLineComment(user.id, id, p.data);
  return r === "not_found" ? fail(404, r) : r === "not_allowed" ? fail(409, r) : json(r, 201);
}
