import { z } from "zod";
import { fail, isResponse, json, limited, requireRole } from "@/lib/api";
import { MAX_CLIENT_PAGE, searchClients } from "@/lib/contacts";

const filter = z.object({ q: z.string().trim().max(60).optional(), page: z.coerce.number().int().min(1).max(MAX_CLIENT_PAGE).optional() });

// Annuaire des clients de la plateforme pour un menuisier (noms, coordonnées masquées). Débit borné : pas de moisson de l'annuaire.
export async function GET(req: Request) {
  const user = await requireRole("menuisier");
  if (isResponse(user)) return user;
  const blocked = await limited({ key: `clients:${user.id}`, limit: 90, windowSec: 600 });
  if (blocked) return blocked;
  const f = filter.safeParse(Object.fromEntries([...new URL(req.url).searchParams].filter(([, v]) => v)));
  return f.success ? json(await searchClients(f.data)) : fail(400, "invalid_query");
}
