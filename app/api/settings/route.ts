import { isResponse, json, parseBody, requireUser } from "@/lib/api";
import { settingsSchema, type Settings, withDefaults } from "@/lib/model";
import { getSettings, saveSettings } from "@/lib/repo";

export async function GET() {
  const user = await requireUser();
  return isResponse(user) ? user : json(await getSettings(user.id));
}

export async function PUT(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const p = await parseBody(req, settingsSchema);
  if ("res" in p) return p.res;
  const data = withDefaults(p.data as Partial<Settings>);
  await saveSettings(user.id, data);
  return json(data);
}
