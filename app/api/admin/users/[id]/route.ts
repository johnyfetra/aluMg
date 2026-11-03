import { z } from "zod";
import { fail, isResponse, json, parseBody, requireAdmin } from "@/lib/api";
import { deleteAccount, FAIL_STATUS, getUser, setRole, setSuspended } from "@/lib/admin";
import { ROLES } from "@/lib/model";

const uuid = z.uuid();

export async function GET(_req: Request, { params }: RouteContext<"/api/admin/users/[id]">) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const { id } = await params;
  const u = uuid.safeParse(id).success ? await getUser(id) : null;
  return u ? json({ ...u, self: u.id === user.id }) : fail(404, "not_found");
}

const patch = z.union([z.object({ suspended: z.boolean() }), z.object({ role: z.enum(ROLES) })]);

export async function PATCH(req: Request, { params }: RouteContext<"/api/admin/users/[id]">) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!uuid.safeParse(id).success) return fail(404, "not_found");
  const p = await parseBody(req, patch);
  if ("res" in p) return p.res;
  const r = "suspended" in p.data ? await setSuspended(user, id, p.data.suspended) : await setRole(user, id, p.data.role);
  return "error" in r ? fail(FAIL_STATUS[r.error], r.error) : json(r);
}

// Confirmation forte : le corps porte l'e-mail (ou le téléphone) du compte, retapé par l'administrateur.
export async function DELETE(req: Request, { params }: RouteContext<"/api/admin/users/[id]">) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!uuid.safeParse(id).success) return fail(404, "not_found");
  const p = await parseBody(req, z.object({ confirm: z.string().max(160) }));
  if ("res" in p) return p.res;
  const r = await deleteAccount(user, id, p.data.confirm);
  return "error" in r ? fail(FAIL_STATUS[r.error], r.error) : json(r);
}
