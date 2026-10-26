import { describe, expect, it } from "vitest";
import { unitPrice } from "./calc";
import { costLine, laborMinutes, laborTotal, marginOf, salePrice } from "./costing";
import { type Line, type Settings, lineSchema, withDefaults } from "./model";

const S = withDefaults({});
const win = (p: Partial<Line> = {}): Line =>
  lineSchema.parse({ id: "x", category: "fenetre", opening: "coulissant", leaves: 2, shutter: "roulant", control: "manuel", guard: "barreaudage", range: "asiatique", finish: "blanc", infill: "vitree", glassType: "clair", thickness: "5", pattern: "none", extras: [], width: 1200, height: 1200, qty: 1, unit: 0, ...p });
const withS = (p: Partial<Settings>): Settings => ({ ...S, ...p });

describe("chiffrage au prix de revient", () => {
  it("minutes de main-d'œuvre = fixe + coupes + vantaux + verre", () => {
    const labor = { rate: 6000, fixedMin: 30, cutMin: 2, leafMin: 40, glazingMin: 10 };
    const m = laborMinutes(win(), labor, 1.2);
    expect(m).toBeGreaterThan(30 + 40 * 2 + 10 * 1.2); // + les coupes
    expect(laborMinutes(win(), { ...labor, cutMin: 0, fixedMin: 0, leafMin: 0, glazingMin: 0 }, 5)).toBe(0);
  });
  it("matière, main-d'œuvre, déboursé sec, prix de revient et prix de vente s'enchaînent", () => {
    const c = costLine(win(), S);
    expect(c.material).toBeGreaterThan(0);
    expect(c.labor).toBeGreaterThan(0);
    expect(c.direct).toBe(c.material + c.labor);
    expect(c.full).toBe(Math.round(c.direct * 1.15));
    expect(c.price).toBeGreaterThanOrEqual(Math.round(c.full * 1.3));
    expect(c.price % 1000).toBe(0);
    expect(c.price - c.full * 1.3).toBeLessThan(1000);
  });
  it("taux horaire nul : pas de main-d'œuvre ; marge et frais nuls : prix de vente = déboursé arrondi au millier", () => {
    expect(costLine(win(), withS({ labor: { ...S.labor, rate: 0 } })).labor).toBe(0);
    const c = costLine(win(), withS({ overheadPct: 0, marginPct: 0 }));
    expect(c.price).toBe(Math.ceil(c.direct / 1000) * 1000);
  });
  it("les exemplaires partagent leurs barres : coût unitaire d'un lot ≤ coût d'un seul", () => {
    expect(costLine(win({ qty: 10 }), S).material).toBeLessThanOrEqual(costLine(win({ qty: 1 }), S).material);
  });
  it("profilé sans offre du marché : coût signalé incomplet", () => {
    expect(costLine(win(), S).incomplete).toBe(false);
    expect(costLine(win(), withS({ market: { ...S.market, offers: {} } })).incomplete).toBe(true);
  });
  it("le mode choisi décide du prix : au m² (inchangé) ou au prix de revient", () => {
    const l = win();
    expect(salePrice(l, S)).toBe(unitPrice(l, S.tariffs, S.surcharges, S.minArea));
    expect(salePrice(l, withS({ pricing: "cost" }))).toBe(costLine(l, withS({ pricing: "cost" })).price);
  });
  it("marge sur prix de revient, négative à perte, 0 sans coût", () => {
    expect(marginOf(130, 100)).toBe(30);
    expect(marginOf(80, 100)).toBe(-20);
    expect(marginOf(100, 0)).toBe(0);
  });
  it("main-d'œuvre totale d'un devis : somme × quantités", () => {
    const one = laborTotal([win()], S);
    expect(Math.abs(laborTotal([win({ qty: 3 })], S) - one * 3)).toBeLessThanOrEqual(50); // la surface de verre est arrondie au 1/100 de m²
  });
  it("anciens réglages sans ces champs : valeurs par défaut, taux partiel complété", () => {
    const old = withDefaults({ company: "Ancien" } as Partial<Settings>);
    expect([old.pricing, old.overheadPct, old.labor.rate]).toEqual(["m2", 15, 5000]);
    expect(withDefaults({ labor: { rate: 7000 } } as Partial<Settings>).labor).toMatchObject({ rate: 7000, fixedMin: 30 });
  });
});
