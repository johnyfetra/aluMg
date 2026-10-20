import { isResponse, json, parseBody, requireRole } from "@/lib/api";
import { getOwnProfile, profileSchema, saveOwnProfile } from "@/lib/profiles";

export async function GET() {
  const user = await requireRole("menuisier");
  return isResponse(user) ? user : json(await getOwnProfile(user.id, user.name));
}

export async function PUT(req: Request) {
  const user = await requireRole("menuisier");
  if (isResponse(user)) return user;
  const p = await parseBody(req, profileSchema);
  if ("res" in p) return p.res;
  const saved = await saveOwnProfile(user.id, user.name, p.data);
  return saved === "incomplete" ? json({ error: "incomplete" }, 422) : json(saved);
}
