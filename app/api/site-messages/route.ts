import { clientIp, json, limited, parseBody } from "@/lib/api";
import { createSiteMessage, siteMessageSchema } from "@/lib/site-messages";

// Bulle de discussion du site : sans compte, bornée par adresse IP (5 messages par 10 minutes).
export async function POST(req: Request) {
  const p = await parseBody(req, siteMessageSchema, 8_000);
  if ("res" in p) return p.res;
  const blocked = await limited({ key: `site-msg:${clientIp(req)}`, limit: 5, windowSec: 600 });
  if (blocked) return blocked;
  await createSiteMessage(p.data);
  return json({ ok: true }, 201);
}
