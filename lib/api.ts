import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { currentUser, type SessionUser } from "./auth";

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
export const fail = (status: number, error: string) => json({ error }, status);

// Renvoie l'utilisateur connecté, ou la réponse 401 à retourner telle quelle.
export async function requireUser(): Promise<SessionUser | NextResponse> {
  return (await currentUser()) ?? fail(401, "unauthorized");
}
export const isResponse = (x: unknown): x is NextResponse => x instanceof NextResponse;

// Lit et valide le corps JSON d'une requête : 400 si illisible ou non conforme au schéma.
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<{ data: T } | { res: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { res: fail(400, "invalid_json") };
  }
  const r = schema.safeParse(raw);
  return r.success ? { data: r.data } : { res: json({ error: "invalid_body", issues: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, 400) };
}
