import { describe, expect, it } from "vitest";

process.env.PGLITE_DIR = "memory://";
const repo = await import("./repo");
const { hashPassword } = await import("./auth");
const { appLogin, importLocal } = await import("./app-import");
const { DEFAULT_SETTINGS } = await import("./model");

const quote = (id: string) => ({
  id, number: "DV-2026-0001", date: "2026-11-26T10:00:00.000Z", status: "sent", client: { name: "Rakoto", phone: "", address: "", email: "" }, project: "", delay: "", notes: "",
  lines: [{ id: "l1", category: "fenetre", opening: "coulissant", leaves: 2, shutter: "roulant", control: "manuel", guard: "barreaudage", range: "asiatique", finish: "blanc", infill: "vitree", glassType: "clair", thickness: "5", pattern: "none", extras: [], width: 1200, height: 1000, qty: 1, unit: 264000 }],
  services: [], warranty: 12, discount: 0, progress: 0, rev: 0, terms: { tva: 0, deposit: 50, validityDays: 30 },
});

describe("reprise des devis de l'application locale", () => {
  it("connexion : menuisier seulement, mot de passe vérifié", async () => {
    await repo.createUser("m@ex.mg", "Menuisier", await hashPassword("secret-123"), "menuisier", "034 55 555 55", { verified: true });
    await repo.createUser("c@ex.mg", "Client", await hashPassword("secret-123"), "client", "034 66 666 66", { verified: true });
    expect(await appLogin("m@ex.mg", "mauvais")).toBe("invalid_credentials");
    expect(await appLogin("C@EX.MG", "secret-123")).toBe("not_menuisier");
    expect(typeof (await appLogin("034 55 555 55", "secret-123"))).toBe("object");
  });
  it("devis repris en brouillon et renumérotés, sans doublon au second envoi ; réglages seulement sur un compte vierge", async () => {
    const u = await repo.createUser("n@ex.mg", "Neuf", "h", "menuisier", "034 77 777 77", { verified: true });
    const settings = { ...DEFAULT_SETTINGS, company: "Alu Atelier" };
    const qs = [quote("00000000-0000-4000-8000-0000000000a1"), quote("00000000-0000-4000-8000-0000000000a2"), { pas: "un devis" }];
    expect(await importLocal(u!, settings, qs)).toEqual({ imported: 2, skipped: 1, settings: true });
    expect(await importLocal(u!, { ...settings, company: "Autre" }, qs)).toEqual({ imported: 0, skipped: 3, settings: false });
    const saved = await repo.listQuotes(u!);
    expect(saved.map((q) => q.status)).toEqual(["draft", "draft"]);
    expect((await repo.getSettings(u!)).company).toBe("Alu Atelier");
  });
});
