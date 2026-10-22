import { z } from "zod";
import { fail, isResponse, json, requireRole } from "@/lib/api";
import { citableQuotes } from "@/lib/chat";

// Devis qu'on peut citer dans cette conversation (pour le tag « # » du message).
export async function GET(_: Request, { params }: RouteContext<"/api/conversations/[id]/quotes">) {
  const user = await requireRole("client", "menuisier");
  if (isResponse(user)) return user;
  const { id } = await params;
  const list = z.uuid().safeParse(id).success ? await citableQuotes(user.id, id) : null;
  return list ? json(list) : fail(404, "not_found");
}
