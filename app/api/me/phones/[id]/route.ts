import { z } from "zod";
import { fail, isResponse, json, requireUser } from "@/lib/api";
import { removePhone } from "@/lib/phones";

// Retire un numéro supplémentaire (le numéro principal ne se retire pas).
export async function DELETE(_req: Request, { params }: RouteContext<"/api/me/phones/[id]">) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return fail(404, "not_found");
  return (await removePhone(user.id, id)) ? json({ ok: true }) : fail(404, "not_found");
}
