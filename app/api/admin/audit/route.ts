import { isResponse, json, requireAdmin } from "@/lib/api";
import { listAudit } from "@/lib/admin";

export async function GET(req: Request) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  return json(await listAudit(Number(new URL(req.url).searchParams.get("page")) || 1));
}
