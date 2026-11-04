import { isResponse, json, requireRole } from "@/lib/api";
import { unreadCount } from "@/lib/chat";
import { unreadNotifications } from "@/lib/notifications";

// Nombre total à afficher sur l'icône de l'application Android : messages non lus + notifications de devis non lues.
export async function GET() {
  const user = await requireRole("client", "menuisier", "admin");
  if (isResponse(user)) return user;
  return json({ count: (await unreadCount(user.id)) + (user.role === "admin" ? 0 : await unreadNotifications(user.id)) });
}
