import { z } from "zod";
import { fail, isResponse, json, limited, requireRole } from "@/lib/api";
import { searchPeople } from "@/lib/chat-info";

const query = z.object({ q: z.string().trim().max(60).default("") });

// Personnes à qui l'utilisateur peut écrire (nouvelle discussion). Débit borné : pas de moisson des annuaires.
export async function GET(req: Request) {
  const user = await requireRole("client", "menuisier", "admin");
  if (isResponse(user)) return user;
  const blocked = await limited({ key: `people:${user.id}`, limit: 120, windowSec: 600 });
  if (blocked) return blocked;
  const p = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  return p.success ? json(await searchPeople(user, p.data.q)) : fail(400, "invalid_query");
}
