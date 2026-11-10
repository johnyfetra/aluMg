import { z } from "zod";
import { fail, isResponse, json, parseBody, requireAdmin } from "@/lib/api";
import { demoStatusSchema, setDemoStatus } from "@/lib/demos";

export async function PATCH(req: Request, { params }: RouteContext<"/api/admin/demo-bookings/[id]">) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return fail(404, "not_found");
  const p = await parseBody(req, demoStatusSchema);
  if ("res" in p) return p.res;
  const r = await setDemoStatus(id, p.data.status);
  return r === "ok" ? json({ ok: true }) : fail(r === "not_found" ? 404 : 409, r);
}
