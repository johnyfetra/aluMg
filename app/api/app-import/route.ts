import { clientIp, fail, json, limited, parseBody } from "@/lib/api";
import { appLogin, importLocal, importSchema } from "@/lib/app-import";

// Application locale, fin de l'essai : connexion au compte et envoi des devis et réglages faits hors ligne (voir lib/app-import.ts).
// Mêmes freins que la connexion. Corps jusqu'à 4 Mo (limite des fonctions Vercel : 4,5 Mo).
export async function POST(req: Request) {
  const p = await parseBody(req, importSchema, 4_000_000);
  if ("res" in p) return p.res;
  const id = p.data.identifier.toLowerCase();
  const blocked = await limited({ key: `login:ip:${clientIp(req)}`, limit: 30, windowSec: 600 }, { key: `login:id:${id}`, limit: 8, windowSec: 600 });
  if (blocked) return blocked;
  const user = await appLogin(id, p.data.password);
  if (typeof user === "string") return fail(user === "invalid_credentials" ? 401 : 403, user);
  return json(await importLocal(user.id, p.data.settings, p.data.quotes));
}
