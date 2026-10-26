import { z } from "zod";
import { isResponse, json, parseBody, requireUser } from "@/lib/api";
import { listNotifications, markNotificationsRead } from "@/lib/notifications";

export async function GET() {
  const user = await requireUser();
  return isResponse(user) ? user : json(await listNotifications(user.id));
}

// Sans id : tout marquer comme lu.
export async function POST(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const p = await parseBody(req, z.object({ id: z.uuid().optional() }));
  if ("res" in p) return p.res;
  await markNotificationsRead(user.id, p.data.id);
  return json({ ok: true });
}
