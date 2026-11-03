import { beforeAll, describe, expect, it } from "vitest";

process.env.PGLITE_DIR = "memory://";
const { getDb, schema } = await import("./db");
const repo = await import("./repo");
const fb = await import("./feedback");
const { hashPassword } = await import("./password");
const { eq } = await import("drizzle-orm");

let joiner: { id: string; name: string; role: "menuisier" };

beforeAll(async () => {
  const h = await hashPassword("secret-pass");
  joiner = { id: (await repo.createUser("", "Atelier Fara", h, "menuisier", "033 98 765 43"))!, name: "Atelier Fara", role: "menuisier" };
});

describe("saisie d'un retour", () => {
  it("exige une vraie phrase et un type connu", () => {
    expect(fb.feedbackSchema.safeParse({ kind: "bug", message: "court" }).success).toBe(false);
    expect(fb.feedbackSchema.safeParse({ kind: "autre", message: "Le bouton Envoyer ne répond pas" }).success).toBe(false);
    expect(fb.feedbackSchema.safeParse({ kind: "bug", message: "x".repeat(2001) }).success).toBe(false);
  });
  it("garde le chemin de l'écran, sans paramètres ni autre adresse", () => {
    const ok = (page: string) => fb.feedbackSchema.safeParse({ kind: "idea", message: "Ajouter un bon de commande", page }).success;
    expect(ok("/devis/12")).toBe(true);
    expect(ok("")).toBe(true);
    expect(ok("/devis?token=abc")).toBe(false);
    expect(ok("https://autre.site/x")).toBe(false);
  });
});

const tick = () => new Promise((r) => setTimeout(r, 5)); // des horodatages distincts : l'ordre « plus récent d'abord » est alors sans ambiguïté

describe("liste et traitement", () => {
  it("les plus récents d'abord, filtrés par type et par statut, avec le nombre de nouveaux", async () => {
    await fb.createFeedback(joiner, { kind: "bug", message: "Le PDF du devis n'affiche pas le logo", page: "/devis/1" });
    await tick();
    await fb.createFeedback(joiner, { kind: "idea", message: "Pouvoir joindre un bon de commande fournisseur", page: "" });
    await tick();
    await fb.createFeedback(joiner, { kind: "remark", message: "Les écrans sont clairs, merci pour l'application", page: "/tableau-de-bord" });
    const all = await fb.listFeedback();
    expect(all.total).toBe(3);
    expect(all.news).toBe(3);
    expect(all.items[0].kind).toBe("remark");
    expect(all.items[0]).toMatchObject({ authorName: "Atelier Fara", authorRole: "menuisier", status: "new", page: "/tableau-de-bord" });
    expect((await fb.listFeedback({ kind: "bug" })).items.map((i) => i.page)).toEqual(["/devis/1"]);
  });
  it("change le statut, refuse un identifiant inconnu", async () => {
    const first = (await fb.listFeedback({ kind: "bug" })).items[0];
    expect(await fb.setFeedbackStatus(first.id, "done")).toBe(true);
    const done = await fb.listFeedback({ status: "done" });
    expect(done.items.map((i) => i.id)).toEqual([first.id]);
    expect(done.news).toBe(2);
    expect(await fb.setFeedbackStatus(crypto.randomUUID(), "seen")).toBe(false);
  });
  it("une page hors bornes est ramenée dans les bornes", async () => {
    expect((await fb.listFeedback({ page: 99_999 })).page).toBeLessThanOrEqual(400);
    expect((await fb.listFeedback({ page: -3 })).page).toBe(1);
  });
  it("le message survit à la suppression du compte, signé du nom d'alors", async () => {
    const db = await getDb();
    await db.delete(schema.users).where(eq(schema.users.id, joiner.id));
    const all = await fb.listFeedback();
    expect(all.total).toBe(3);
    expect(all.items.every((i) => i.userId === null && i.authorName === "Atelier Fara")).toBe(true);
  });
});
