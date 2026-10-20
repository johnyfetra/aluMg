import { z } from "zod";
import { fail, isResponse, json, parseBody, requireRole } from "@/lib/api";
import { messageSchema, readMessages, sendMessage } from "@/lib/chat";

type Ctx = RouteContext<"/api/conversations/[id]/messages">;

// Messages de la conversation (les ouvrir les marque comme lus). ?after=<date ISO> : seulement les nouveaux.
export async function GET(req: Request, { params }: Ctx) {
  const user = await requireRole("client", "menuisier");
  if (isResponse(user)) return user;
  const { id } = await params;
  const msgs = z.uuid().safeParse(id).success ? await readMessages(user.id, id, new URL(req.url).searchParams.get("after") ?? undefined) : null;
  return msgs ? json(msgs) : fail(404, "not_found");
}

export async function POST(req: Request, { params }: Ctx) {
  const user = await requireRole("client", "menuisier");
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return fail(404, "not_found");
  const p = await parseBody(req, messageSchema);
  if ("res" in p) return p.res;
  const m = await sendMessage(user.id, id, p.data.body);
  return m ? json(m, 201) : fail(404, "not_found");
}
