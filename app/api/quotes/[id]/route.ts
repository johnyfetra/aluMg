import { z } from "zod";
import { fail, isResponse, json, parseBody, requireRole } from "@/lib/api";
import { quoteSchema } from "@/lib/model";
import { deleteQuote, getQuote, updateQuote } from "@/lib/repo";

type Ctx = RouteContext<"/api/quotes/[id]">;
const uuid = z.uuid();

export async function GET(_: Request, { params }: Ctx) {
  const user = await requireRole("menuisier");
  if (isResponse(user)) return user;
  const { id } = await params;
  const q = uuid.safeParse(id).success ? await getQuote(user.id, id) : null;
  return q ? json(q) : fail(404, "not_found");
}

export async function PUT(req: Request, { params }: Ctx) {
  const user = await requireRole("menuisier");
  if (isResponse(user)) return user;
  const { id } = await params;
  const p = await parseBody(req, quoteSchema);
  if ("res" in p) return p.res;
  const saved = uuid.safeParse(id).success ? await updateQuote(user.id, id, p.data) : null;
  return saved ? json(saved) : fail(404, "not_found");
}

export async function DELETE(_: Request, { params }: Ctx) {
  const user = await requireRole("menuisier");
  if (isResponse(user)) return user;
  const { id } = await params;
  const done = uuid.safeParse(id).success ? await deleteQuote(user.id, id) : false;
  if (done === "locked") return fail(409, "locked");
  return done ? json({ ok: true }) : fail(404, "not_found");
}
