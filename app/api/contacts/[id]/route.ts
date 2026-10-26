import { z } from "zod";
import { fail, isResponse, json, parseBody, requireRole } from "@/lib/api";
import { contactSchema, deleteContact, saveContact } from "@/lib/contacts";

const uuid = z.uuid();

export async function PUT(req: Request, { params }: RouteContext<"/api/contacts/[id]">) {
  const user = await requireRole("menuisier");
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!uuid.safeParse(id).success) return fail(404, "not_found");
  const p = await parseBody(req, contactSchema);
  if ("res" in p) return p.res;
  const c = await saveContact(user.id, p.data, id);
  return c ? json({ id: c.id }) : fail(404, "not_found");
}

export async function DELETE(_: Request, { params }: RouteContext<"/api/contacts/[id]">) {
  const user = await requireRole("menuisier");
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!uuid.safeParse(id).success) return fail(404, "not_found");
  return (await deleteContact(user.id, id)) ? json({ ok: true }) : fail(404, "not_found");
}
