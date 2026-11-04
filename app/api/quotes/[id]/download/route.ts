import { z } from "zod";
import { fail, isResponse, json, limited, requireRole } from "@/lib/api";
import { recordDownload } from "@/lib/downloads";

// Compte un téléchargement de PDF (menuisier du devis ou client destinataire). Débit borné : le compteur ne se gonfle pas à la main.
export async function POST(_req: Request, { params }: RouteContext<"/api/quotes/[id]/download">) {
  const user = await requireRole("menuisier", "client");
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return fail(404, "not_found");
  const blocked = await limited({ key: `download:${user.id}`, limit: 60, windowSec: 600 });
  if (blocked) return blocked;
  const r = await recordDownload(user.id, id);
  return "error" in r ? fail(404, r.error) : json(r);
}
