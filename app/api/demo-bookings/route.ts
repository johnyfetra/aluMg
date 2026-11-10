import { clientIp, fail, json, limited, parseBody } from "@/lib/api";
import { bookDemo, demoSchema, takenSlots } from "@/lib/demos";

// Calendrier public de la page d'accueil : créneaux déjà pris (sans aucune donnée personnelle).
export async function GET() {
  return json({ taken: await takenSlots() }, 200, { "Cache-Control": "no-store" });
}

// Prise de rendez-vous sans compte : bornée par adresse IP (5 par heure) contre le remplissage abusif du calendrier.
// Seules les demandes valides comptent : une faute de saisie corrigée ne bloque pas le visiteur.
export async function POST(req: Request) {
  const p = await parseBody(req, demoSchema, 4_000);
  if ("res" in p) return p.res;
  const blocked = await limited({ key: `demo-booking:${clientIp(req)}`, limit: 5, windowSec: 3600 });
  if (blocked) return blocked;
  const r = await bookDemo(p.data);
  return r.ok ? json({ ok: true }, 201) : fail(409, r.error);
}
