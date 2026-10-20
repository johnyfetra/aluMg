import { isResponse, json, requireRole } from "@/lib/api";
import { unreadCount } from "@/lib/chat";

export async function GET() {
  const user = await requireRole("client", "menuisier");
  return isResponse(user) ? user : json({ count: await unreadCount(user.id) });
}
