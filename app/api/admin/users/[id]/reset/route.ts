import { z } from "zod";
import { fail, isResponse, json, limited, requireAdmin } from "@/lib/api";
import { FAIL_STATUS, resetAccount } from "@/lib/admin";

// Le mot de passe temporaire n'est renvoyé qu'ici, une seule fois, et n'est jamais journalisé.
export async function POST(_req: Request, { params }: RouteContext<"/api/admin/users/[id]/reset">) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const blocked = await limited({ key: `admin:reset:${user.id}`, limit: 20, windowSec: 3600 });
  if (blocked) return blocked;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return fail(404, "not_found");
  const r = await resetAccount(user, id);
  return "error" in r ? fail(FAIL_STATUS[r.error], r.error) : json(r);
}
