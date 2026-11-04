import { asc, desc, eq, gt, lt, max } from "drizzle-orm";
import { type Actor, audit } from "./admin";
import { getDb, schema } from "./db";
import { type PublicSocial, type SocialInput, type SocialLink, socialSchema } from "./social";

// Réseaux sociaux de la plateforme. Lecture publique (liens visibles seulement) et gestion par l'administration, chaque changement étant journalisé.
const t = schema.socialLinks;
const order = [asc(t.position), asc(t.createdAt)] as const;

export async function listPublicSocial(): Promise<PublicSocial[]> {
  const db = await getDb();
  return db.select({ id: t.id, network: t.network, label: t.label, url: t.url }).from(t).where(eq(t.visible, true)).orderBy(...order);
}

export async function listSocial(): Promise<SocialLink[]> {
  const db = await getDb();
  return db.select({ id: t.id, network: t.network, label: t.label, url: t.url, position: t.position, visible: t.visible }).from(t).orderBy(...order);
}

type Fail = { error: "not_found" | "invalid" };
const labelOf = (v: { network: string; label: string }) => `${v.network} · ${v.label}`;

export async function createSocial(actor: Actor, input: SocialInput): Promise<{ id: string } | Fail> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [{ top }] = await tx.select({ top: max(t.position) }).from(t);
    const [row] = await tx.insert(t).values({ ...input, position: (top ?? -1) + 1 }).returning({ id: t.id });
    await audit(tx, actor, "social_add", { id: null, label: labelOf(input) });
    return { id: row.id };
  });
}

// Modification partielle : le résultat est revalidé en entier (l'adresse doit rester celle du réseau).
export async function updateSocial(actor: Actor, id: string, patch: Partial<SocialInput>): Promise<{ ok: true } | Fail> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [cur] = await tx.select().from(t).where(eq(t.id, id)).for("update");
    if (!cur) return { error: "not_found" } as const;
    const next = socialSchema.safeParse({ network: cur.network, label: cur.label, url: cur.url, visible: cur.visible, ...patch });
    if (!next.success) return { error: "invalid" } as const;
    await tx.update(t).set(next.data).where(eq(t.id, id));
    await audit(tx, actor, "social_edit", { id: null, label: labelOf(next.data) });
    return { ok: true } as const;
  });
}

export async function deleteSocial(actor: Actor, id: string): Promise<{ ok: true } | Fail> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [cur] = await tx.delete(t).where(eq(t.id, id)).returning({ network: t.network, label: t.label });
    if (!cur) return { error: "not_found" } as const;
    await audit(tx, actor, "social_delete", { id: null, label: labelOf(cur) });
    return { ok: true } as const;
  });
}

// Monter ou descendre un lien : échange sa position avec celle de son voisin.
export async function moveSocial(id: string, dir: "up" | "down"): Promise<{ ok: true } | Fail> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [cur] = await tx.select().from(t).where(eq(t.id, id)).for("update");
    if (!cur) return { error: "not_found" } as const;
    const [next] = await tx.select().from(t).where(dir === "up" ? lt(t.position, cur.position) : gt(t.position, cur.position)).orderBy(dir === "up" ? desc(t.position) : asc(t.position)).limit(1).for("update");
    if (!next) return { ok: true } as const;
    await tx.update(t).set({ position: next.position }).where(eq(t.id, cur.id));
    await tx.update(t).set({ position: cur.position }).where(eq(t.id, next.id));
    return { ok: true } as const;
  });
}
