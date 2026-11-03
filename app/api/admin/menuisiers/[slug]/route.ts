import { z } from "zod";
import { fail, isResponse, json, parseBody, requireAdmin } from "@/lib/api";
import { FAIL_STATUS, setBadge } from "@/lib/admin";

// Réservé à l'administrateur : accorder ou retirer le badge « Vérifié ».
export async function PATCH(req: Request, { params }: RouteContext<"/api/admin/menuisiers/[slug]">) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const { slug } = await params;
  const p = await parseBody(req, z.object({ verified: z.boolean() }));
  if ("res" in p) return p.res;
  const r = await setBadge(user, slug.slice(0, 80), p.data.verified);
  return "error" in r ? fail(FAIL_STATUS[r.error], r.error) : json(r);
}
