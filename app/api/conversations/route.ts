import { fail, isResponse, json, parseBody, requireRole } from "@/lib/api";
import { listConversations, startConversation, startSchema } from "@/lib/chat";

export async function GET() {
  const user = await requireRole("client", "menuisier");
  return isResponse(user) ? user : json(await listConversations(user.id));
}

// Ouvre (ou retrouve) la conversation avec un menuisier publié (client) ou avec un client qui a demandé un devis (menuisier).
export async function POST(req: Request) {
  const user = await requireRole("client", "menuisier");
  if (isResponse(user)) return user;
  const p = await parseBody(req, startSchema);
  if ("res" in p) return p.res;
  const r = await startConversation(user, p.data);
  return r.ok ? json({ id: r.id }) : fail(r.error === "not_found" ? 404 : 403, r.error);
}
