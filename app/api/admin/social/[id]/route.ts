import { z } from "zod";
import { fail, isResponse, json, parseBody, requireAdmin } from "@/lib/api";
import { SOCIAL_NETWORKS } from "@/lib/model";
import { deleteSocial, moveSocial, updateSocial } from "@/lib/socials";

const uuid = z.uuid();
const patch = z.object({
  network: z.enum(SOCIAL_NETWORKS).optional(),
  label: z.string().trim().min(1).max(60).optional(),
  url: z.string().trim().max(300).optional(),
  visible: z.boolean().optional(),
  move: z.enum(["up", "down"]).optional(), // monter ou descendre dans le pied de page
});
const STATUS = { not_found: 404, invalid: 400 } as const;

export async function PATCH(req: Request, { params }: RouteContext<"/api/admin/social/[id]">) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!uuid.safeParse(id).success) return fail(404, "not_found");
  const p = await parseBody(req, patch);
  if ("res" in p) return p.res;
  const { move, ...rest } = p.data;
  const r = move ? await moveSocial(id, move) : await updateSocial({ id: user.id, name: user.name }, id, rest);
  return "error" in r ? fail(STATUS[r.error], r.error) : json(r);
}

export async function DELETE(_req: Request, { params }: RouteContext<"/api/admin/social/[id]">) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!uuid.safeParse(id).success) return fail(404, "not_found");
  const r = await deleteSocial({ id: user.id, name: user.name }, id);
  return "error" in r ? fail(STATUS[r.error], r.error) : json(r);
}
