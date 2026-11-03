import { isResponse, json, requireAdmin } from "@/lib/api";
import { stats } from "@/lib/admin";

export async function GET() {
  const user = await requireAdmin();
  return isResponse(user) ? user : json(await stats());
}
