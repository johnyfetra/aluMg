import { isResponse, json, requireRole } from "@/lib/api";
import { listClientQuotes } from "@/lib/workflow";

export async function GET() {
  const user = await requireRole("client");
  return isResponse(user) ? user : json(await listClientQuotes(user.id));
}
