import { beforeAll, describe, expect, it } from "vitest";

process.env.PGLITE_DIR = "memory://";
const repo = await import("./repo");
const sm = await import("./site-messages");
const { hashPassword } = await import("./password");

beforeAll(async () => {
  await repo.createUser("", "Atelier Fara", await hashPassword("secret-pass"), "menuisier", "033 98 765 43");
});

describe("messages du site", () => {
  it("exige nom, numéro valide et message", () => {
    expect(sm.siteMessageSchema.safeParse({ name: "R", phone: "033 98 765 43", message: "Bonjour" }).success).toBe(false);
    expect(sm.siteMessageSchema.safeParse({ name: "Rivo", phone: "12", message: "Bonjour" }).success).toBe(false);
    expect(sm.siteMessageSchema.safeParse({ name: "Rivo", phone: "033 98 765 43", message: "Bonjour", page: "/?x=1" }).success).toBe(false);
  });

  it("reconnaît le rôle d'un compte par son numéro, sinon « visiteur »", async () => {
    await sm.createSiteMessage(sm.siteMessageSchema.parse({ name: "Fara", phone: "+261 33 98 765 43", message: "Je cherche un fournisseur" }));
    await sm.createSiteMessage(sm.siteMessageSchema.parse({ name: "Lova", phone: "034 11 111 11", message: "Prix d'une fenêtre ?" }));
    const { items, news } = await sm.listSiteMessages({ status: "new" });
    expect(news).toBe(2);
    expect(Object.fromEntries(items.map((i) => [i.name, i.role]))).toEqual({ Fara: "menuisier", Lova: "visitor" });
    expect(items.find((i) => i.name === "Fara")?.userId).toBeTruthy();
  });
});
