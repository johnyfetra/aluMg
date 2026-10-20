import { z } from "zod";
import { fail, isResponse, json, requireUser } from "@/lib/api";
import { listEvents, sideOf } from "@/lib/workflow";

// Historique d'un devis : visible par le menuisier propriétaire et par le client demandeur, personne d'autre.
export async function GET(_: Request, { params }: RouteContext<"/api/quotes/[id]/events">) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success || !(await sideOf(user.id, id))) return fail(404, "not_found");
  return json(await listEvents(id));
}
