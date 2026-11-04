import { z } from "zod";
import { fail, isResponse, json, requireAdmin } from "@/lib/api";
import { getAccountConfig, getUser } from "@/lib/admin";

export async function GET(_req: Request, { params }: RouteContext<"/api/admin/users/[id]/config">) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const { id } = await params;
  return z.uuid().safeParse(id).success && (await getUser(id)) ? json(await getAccountConfig(id)) : fail(404, "not_found");
}
