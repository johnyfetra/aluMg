import { z } from "zod";
import { fail, isResponse, json, requireAdmin } from "@/lib/api";
import { listAllQuotes, MAX_PAGE } from "@/lib/admin";
import { STATUSES } from "@/lib/model";

const filter = z.object({
  q: z.string().trim().max(80).optional(),
  owner: z.string().trim().max(80).optional(),
  client: z.string().trim().max(80).optional(),
  status: z.enum(STATUSES).optional(),
  user: z.uuid().optional(),
  page: z.coerce.number().int().min(1).max(MAX_PAGE).optional(),
});

export async function GET(req: Request) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const f = filter.safeParse(Object.fromEntries([...new URL(req.url).searchParams].filter(([, v]) => v)));
  return f.success ? json(await listAllQuotes(f.data)) : fail(400, "invalid_query");
}
