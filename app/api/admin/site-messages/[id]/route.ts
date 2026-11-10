import { z } from "zod";
import { fail, isResponse, json, parseBody, requireAdmin } from "@/lib/api";
import { setSiteMessageStatus, siteStatusSchema } from "@/lib/site-messages";

export async function PATCH(req: Request, { params }: RouteContext<"/api/admin/site-messages/[id]">) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return fail(404, "not_found");
  const p = await parseBody(req, siteStatusSchema);
  if ("res" in p) return p.res;
  return (await setSiteMessageStatus(id, p.data.status)) ? json({ ok: true }) : fail(404, "not_found");
}
