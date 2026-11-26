import { clientIp, json, limited, parseBody } from "@/lib/api";
import { checkTrial, trialSchema } from "@/lib/app-trial";

// Application Android locale : début de l'essai de cet appareil (créé au premier appel). Sans compte : bornée par adresse IP.
export async function POST(req: Request) {
  const p = await parseBody(req, trialSchema, 1_000);
  if ("res" in p) return p.res;
  const blocked = await limited({ key: `app-trial:${clientIp(req)}`, limit: 60, windowSec: 3600 });
  if (blocked) return blocked;
  return json(await checkTrial(p.data.device), 200, { "Cache-Control": "no-store" });
}
