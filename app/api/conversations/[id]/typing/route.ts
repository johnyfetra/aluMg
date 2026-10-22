import { z } from "zod";
import { fail, isResponse, json, parseBody, requireRole } from "@/lib/api";
import { getTyping, setTyping } from "@/lib/chat";

type Ctx = RouteContext<"/api/conversations/[id]/typing">;

// L'autre participant est-il en train d'écrire (ou d'enregistrer un vocal) ?
export async function GET(_: Request, { params }: Ctx) {
  const user = await requireRole("client", "menuisier");
  if (isResponse(user)) return user;
  const { id } = await params;
  const typing = z.uuid().safeParse(id).success ? await getTyping(user.id, id) : undefined;
  return typing === undefined ? fail(404, "not_found") : json({ typing });
}

// « J'écris » : à renvoyer toutes les quelques secondes tant que la saisie continue.
export async function POST(req: Request, { params }: Ctx) {
  const user = await requireRole("client", "menuisier");
  if (isResponse(user)) return user;
  const { id } = await params;
  const p = await parseBody(req, z.object({ kind: z.enum(["text", "voice"]) }));
  if ("res" in p) return p.res;
  return z.uuid().safeParse(id).success && (await setTyping(user.id, id, p.data.kind)) ? json({ ok: true }) : fail(404, "not_found");
}
