import { z } from "zod";
import { fail, isResponse, json, parseBody, requireRole } from "@/lib/api";
import { setVerified } from "@/lib/profiles";

// Réservé à l'administrateur : accorder ou retirer le badge « Vérifié ».
export async function PATCH(req: Request, { params }: RouteContext<"/api/admin/menuisiers/[slug]">) {
  const user = await requireRole("admin");
  if (isResponse(user)) return user;
  const { slug } = await params;
  const p = await parseBody(req, z.object({ verified: z.boolean() }));
  if ("res" in p) return p.res;
  return (await setVerified(slug.slice(0, 80), p.data.verified)) ? json({ ok: true }) : fail(404, "not_found");
}
