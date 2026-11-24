import { z } from "zod";
import { fail, isResponse, json, requireRole } from "@/lib/api";
import { deleteReceipt } from "@/lib/receipts";

const uuid = z.uuid();

export async function DELETE(_: Request, { params }: RouteContext<"/api/quotes/[id]/receipts/[rid]">) {
  const user = await requireRole("menuisier");
  if (isResponse(user)) return user;
  const { id, rid } = await params;
  const r = uuid.safeParse(id).success && uuid.safeParse(rid).success ? await deleteReceipt(user.id, id, rid) : null;
  return r ? json(r) : fail(404, "not_found");
}
