import { isResponse, json, limited, parseBody, requireUser } from "@/lib/api";
import { createFeedback, feedbackSchema } from "@/lib/feedback";

// Tout compte connecté peut signaler un problème, proposer une idée ou laisser une remarque (au plus 5 par 10 minutes).
export async function POST(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const blocked = await limited({ key: `feedback:${user.id}`, limit: 5, windowSec: 600 });
  if (blocked) return blocked;
  const p = await parseBody(req, feedbackSchema);
  if ("res" in p) return p.res;
  await createFeedback(user, p.data);
  return json({ ok: true }, 201);
}
