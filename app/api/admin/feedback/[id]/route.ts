import { z } from "zod";
import { fail, isResponse, json, parseBody, requireAdmin } from "@/lib/api";
import { setFeedbackStatus, statusSchema } from "@/lib/feedback";

export async function PATCH(req: Request, { params }: RouteContext<"/api/admin/feedback/[id]">) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return fail(404, "not_found");
  const p = await parseBody(req, statusSchema);
  if ("res" in p) return p.res;
  return (await setFeedbackStatus(id, p.data.status)) ? json({ ok: true }) : fail(404, "not_found");
}
