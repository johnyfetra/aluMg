import { describe, expect, it } from "vitest";
import { type Line, lineSchema, quoteSchema } from "./model";
import { daysLeft, serviceTotal, totals } from "./totals";

const line: Line = lineSchema.parse({
  id: "x", category: "fenetre", opening: "ouvrant", leaves: 2, shutter: "roulant", control: "manuel", guard: "barreaudage", range: "asiatique",
  finish: "blanc", infill: "vitree", glassType: "clair", thickness: "5", pattern: "none", extras: [], width: 1200, height: 1000, qty: 2, unit: 100000,
});
const terms = { tva: 20, deposit: 30, validityDays: 30 };

describe("totaux avec prestations", () => {
  it("sans prestation : comme avant", () => {
    expect(totals({ lines: [line], terms })).toMatchObject({ gross: 200000, ht: 200000, tva: 40000, ttc: 240000 });
  });
  it("les prestations s'ajoutent avant la remise et la TVA", () => {
    const services = [{ id: "s1", kind: "pose" as const, label: "Pose", qty: 2, price: 50000 }, { id: "s2", kind: "deplacement" as const, label: "Transport", qty: 1, price: 30000 }];
    expect(totals({ lines: [line], services, terms, discount: 10 })).toMatchObject({ gross: 330000, discount: 33000, ht: 297000, tva: 59400, ttc: 356400 });
  });
  it("quantité décimale arrondie à l'Ariary", () => {
    expect(serviceTotal({ qty: 2.5, price: 10001 })).toBe(25003);
  });
  it("le schéma accepte l'absence de prestations et refuse un prix négatif", () => {
    const base = { id: crypto.randomUUID(), number: "", date: "", status: "draft", client: { name: "", phone: "", address: "" }, project: "", delay: "", notes: "", lines: [line], terms };
    expect(quoteSchema.safeParse(base).success).toBe(true);
    expect(quoteSchema.safeParse({ ...base, services: [{ id: "a", kind: "pose", label: "", qty: 1, price: -1 }] }).success).toBe(false);
    expect(quoteSchema.safeParse({ ...base, services: [{ id: "a", kind: "inconnu", label: "", qty: 1, price: 1 }] }).success).toBe(false);
  });
});

describe("validité du devis", () => {
  it("compte les jours restants depuis la création, négatif une fois dépassée", () => {
    const now = Date.parse("2026-10-10T00:00:00Z");
    expect(daysLeft({ date: "2026-10-01T00:00:00Z", terms }, now)).toBe(21); // 30 jours − 9 écoulés
    expect(daysLeft({ date: "2026-08-01T00:00:00Z", terms }, now)).toBeLessThan(0);
  });
});
