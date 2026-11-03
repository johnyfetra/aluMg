import { and, asc, count, eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { MAX_EXTRA_PHONES } from "./model";
import { formatPhone, normalizePhone } from "./phone";

// Numéros d'un compte : un principal (users.phone, donné à l'inscription) et des supplémentaires (user_phones, ajoutés dans la configuration du compte).
// Un numéro n'appartient qu'à un seul compte : vérifié ici pour répondre clairement, et garanti par la base (index et déclencheurs de la migration 0017).
type Reader = Pick<Awaited<ReturnType<typeof getDb>>, "select">;
export type PhoneRow = { id: string; phone: string; label: string; primary: boolean };
export type AddOutcome = { ok: true } | { ok: false; error: "invalid_phone" | "phone_taken" | "limit" };

// Violation d'unicité (23505), y compris celle que lèvent les déclencheurs : un autre compte vient de prendre le numéro.
export const isUniqueViolation = (e: unknown) => [e, (e as { cause?: unknown })?.cause].some((x) => (x as { code?: string } | undefined)?.code === "23505");

// Compte qui possède ce numéro (principal ou supplémentaire), ou null.
export async function phoneOwner(norm: string, reader?: Reader): Promise<string | null> {
  const db = reader ?? (await getDb());
  const [main] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.phoneNorm, norm));
  if (main) return main.id;
  const [extra] = await db.select({ id: schema.userPhones.userId }).from(schema.userPhones).where(eq(schema.userPhones.phoneNorm, norm));
  return extra?.id ?? null;
}

export async function listPhones(userId: string): Promise<PhoneRow[]> {
  const db = await getDb();
  const [u] = await db.select({ phone: schema.users.phone, norm: schema.users.phoneNorm }).from(schema.users).where(eq(schema.users.id, userId));
  const extras = await db.select().from(schema.userPhones).where(eq(schema.userPhones.userId, userId)).orderBy(asc(schema.userPhones.createdAt), asc(schema.userPhones.id));
  return [
    ...(u?.norm ? [{ id: "primary", phone: u.phone || formatPhone(u.norm), label: "", primary: true }] : []),
    ...extras.map((x) => ({ id: x.id, phone: x.phone, label: x.label, primary: false })),
  ];
}

// Ajoute un numéro déjà confirmé par code (voir confirmPhoneCode dans lib/verify.ts).
export async function addPhone(userId: string, raw: string, label = ""): Promise<AddOutcome> {
  const norm = normalizePhone(raw);
  if (!norm) return { ok: false, error: "invalid_phone" };
  const db = await getDb();
  try {
    return await db.transaction(async (tx) => {
      const [{ n }] = await tx.select({ n: count() }).from(schema.userPhones).where(eq(schema.userPhones.userId, userId));
      if (n >= MAX_EXTRA_PHONES) return { ok: false, error: "limit" } as const;
      if (await phoneOwner(norm, tx)) return { ok: false, error: "phone_taken" } as const;
      await tx.insert(schema.userPhones).values({ userId, phone: formatPhone(norm), phoneNorm: norm, label: label.trim().slice(0, 40) });
      return { ok: true } as const;
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "phone_taken" };
    throw e;
  }
}

// Retire un numéro supplémentaire du compte (le principal ne se retire pas : il identifie le compte). L'identifiant et le propriétaire sont vérifiés dans la même requête.
export async function removePhone(userId: string, id: string): Promise<boolean> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return false; // « primary » ou une valeur quelconque : pas une erreur de base
  const db = await getDb();
  const r = await db.delete(schema.userPhones).where(and(eq(schema.userPhones.id, id), eq(schema.userPhones.userId, userId))).returning({ id: schema.userPhones.id });
  return r.length > 0;
}
