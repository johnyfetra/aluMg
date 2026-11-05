import { z } from "zod";
import { fail, isResponse, json, parseBody, requireRole } from "@/lib/api";
import { prefsSchema, updatePrefs } from "@/lib/chat-info";

// Favori, sourdine, blocage : réglages de celui qui appelle, invisibles pour l'autre participant.
export async function PATCH(req: Request, { params }: RouteContext<"/api/conversations/[id]/prefs">) {
  const user = await requireRole("client", "menuisier", "admin");
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return fail(404, "not_found");
  const p = await parseBody(req, prefsSchema);
  if ("res" in p) return p.res;
  const r = await updatePrefs(user.id, id, p.data);
  return r.ok ? json({ ok: true }) : fail(r.error === "not_found" ? 404 : 403, r.error);
}
