import { z } from "zod";
import { fail, isResponse, json, requireRole } from "@/lib/api";
import { shareQuote, unshareQuote } from "@/lib/workflow";

type Ctx = RouteContext<"/api/quotes/[id]/share">;

// Lien public du devis : créé (ou relu) par POST, retiré par DELETE. Réservé au menuisier du devis.
export async function POST(_: Request, { params }: Ctx) {
  const user = await requireRole("menuisier");
  if (isResponse(user)) return user;
  const { id } = await params;
  const token = z.uuid().safeParse(id).success ? await shareQuote(user.id, id) : null;
  return token ? json({ token }) : fail(404, "not_found");
}

export async function DELETE(_: Request, { params }: Ctx) {
  const user = await requireRole("menuisier");
  if (isResponse(user)) return user;
  const { id } = await params;
  const done = z.uuid().safeParse(id).success && (await unshareQuote(user.id, id));
  return done ? json({ ok: true }) : fail(404, "not_found");
}
