import { z } from "zod";
import { fail, isResponse, json, requireAdmin } from "@/lib/api";
import { MAX_PAGE } from "@/lib/admin";
import { listFeedback } from "@/lib/feedback";
import { FEEDBACK_KINDS, FEEDBACK_STATUSES } from "@/lib/model";

const filter = z.object({
  kind: z.enum(FEEDBACK_KINDS).optional(),
  status: z.enum(FEEDBACK_STATUSES).optional(),
  page: z.coerce.number().int().min(1).max(MAX_PAGE).optional(),
});

export async function GET(req: Request) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const f = filter.safeParse(Object.fromEntries([...new URL(req.url).searchParams].filter(([, v]) => v)));
  return f.success ? json(await listFeedback(f.data)) : fail(400, "invalid_query");
}
