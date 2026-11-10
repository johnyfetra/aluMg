import { z } from "zod";
import { fail, isResponse, json, requireAdmin } from "@/lib/api";
import { MAX_PAGE } from "@/lib/admin";
import { DEMO_STATUSES } from "@/lib/booking";
import { listDemos } from "@/lib/demos";

const filter = z.object({
  status: z.enum(DEMO_STATUSES).optional(),
  page: z.coerce.number().int().min(1).max(MAX_PAGE).optional(),
});

export async function GET(req: Request) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const f = filter.safeParse(Object.fromEntries([...new URL(req.url).searchParams].filter(([, v]) => v)));
  return f.success ? json(await listDemos(f.data)) : fail(400, "invalid_query");
}
