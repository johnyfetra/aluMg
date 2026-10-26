import { isResponse, json, parseBody, requireRole } from "@/lib/api";
import { contactSchema, listContacts, saveContact } from "@/lib/contacts";

export async function GET() {
  const user = await requireRole("menuisier");
  return isResponse(user) ? user : json(await listContacts(user.id));
}

export async function POST(req: Request) {
  const user = await requireRole("menuisier");
  if (isResponse(user)) return user;
  const p = await parseBody(req, contactSchema);
  if ("res" in p) return p.res;
  const c = await saveContact(user.id, p.data);
  return json({ id: c!.id }, 201);
}
