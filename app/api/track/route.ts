import { clientIp, json } from "@/lib/api";
import { recordVisit } from "@/lib/visits";

// Page vue sur le site public (navigator.sendBeacon) : aucune donnée en retour, aucun cookie posé.
export async function POST(req: Request) {
  await recordVisit(clientIp(req), (req.headers.get("user-agent") ?? "").slice(0, 300));
  return json({ ok: true }, 202);
}
