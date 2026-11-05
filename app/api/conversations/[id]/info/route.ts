import { z } from "zod";
import { fail, isResponse, json, parseBody, requireRole } from "@/lib/api";
import { actionSchema, conversationInfo, runAction } from "@/lib/chat-info";

type Ctx = RouteContext<"/api/conversations/[id]/info">;

// Fiche de la conversation : médias, documents, liens, messages importants.
export async function GET(_req: Request, { params }: Ctx) {
  const user = await requireRole("client", "menuisier", "admin");
  if (isResponse(user)) return user;
  const { id } = await params;
  const info = z.uuid().safeParse(id).success ? await conversationInfo(user.id, id) : null;
  return info ? json(info) : fail(404, "not_found");
}

// Actions : effacer, supprimer, messages éphémères, signaler, étoile sur un message.
export async function POST(req: Request, { params }: Ctx) {
  const user = await requireRole("client", "menuisier", "admin");
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return fail(404, "not_found");
  const p = await parseBody(req, actionSchema);
  if ("res" in p) return p.res;
  const r = await runAction(user.id, id, p.data);
  return r.ok ? json({ ok: true }) : fail(r.error === "not_found" ? 404 : 403, r.error);
}
