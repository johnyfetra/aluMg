import { z } from "zod";
import { fail, isResponse, json, parseBody, requireRole } from "@/lib/api";
import { receiptSchema } from "@/lib/model";
import { addReceipt, listReceipts } from "@/lib/receipts";

type Ctx = RouteContext<"/api/quotes/[id]/receipts">;
const uuid = z.uuid();

// Encaissements du devis (acompte, solde, versements).
export async function GET(_: Request, { params }: Ctx) {
  const user = await requireRole("menuisier");
  if (isResponse(user)) return user;
  const { id } = await params;
  const r = uuid.safeParse(id).success ? await listReceipts(user.id, id) : null;
  return r ? json(r) : fail(404, "not_found");
}

export async function POST(req: Request, { params }: Ctx) {
  const user = await requireRole("menuisier");
  if (isResponse(user)) return user;
  const { id } = await params;
  const p = await parseBody(req, receiptSchema);
  if ("res" in p) return p.res;
  const r = uuid.safeParse(id).success ? await addReceipt(user.id, id, p.data) : null;
  return r ? json(r, 201) : fail(404, "not_found");
}
