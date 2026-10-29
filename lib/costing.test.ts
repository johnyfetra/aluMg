import { describe, expect, it } from "vitest";
import { unitPrice } from "./calc";
import { calibration, costLine, laborMinutes, laborTotal, marginOf, quoteMargin, salePrice, servicesCost } from "./costing";
import { type Line, type Settings, lineSchema, withDefaults } from "./model";

const S = withDefaults({});
const win = (p: Partial<Line> = {}): Line =>
  lineSchema.parse({ id: "x", category: "fenetre", opening: "coulissant", leaves: 2, shutter: "roulant", control: "manuel", guard: "barreaudage", range: "asiatique", finish: "blanc", infill: "vitree", glassType: "clair", thickness: "5", pattern: "none", extras: [], width: 1200, height: 1200, qty: 1, unit: 0, ...p });
const withS = (p: Partial<Settings>): Settings => ({ ...S, ...p });

describe("marge du devis entier", () => {
  const terms = { tva: 20, deposit: 30, validityDays: 30 };
  it("compte le coût des prestations, la remise et donne les deux bases", () => {
    const lines = [{ ...win(), unit: 1_000_000 }];
    const q = { lines, terms, discount: 10, services: [{ id: "s", kind: "pose" as const, label: "Pose", qty: 1, price: 200_000, cost: 120_000 }] };
    const m = quoteMargin(q, S, 400_000);
    expect(m.ht).toBe(1_080_000); // (1 000 000 + 200 000) − 10 %
    expect(m.servicesCost).toBe(120_000);
    expect(m.cost).toBe(400_000 + m.labor + m.overhead + 120_000);
    expect(m.margin).toBe(m.ht - m.cost);
    expect(m.pct).toBe(Math.round((m.margin / m.cost) * 100));
    expect(m.ofSale).toBe(Math.round((m.margin / m.ht) * 100));
    expect(m.servicesUnknown).toBe(false);
  });
  it("signale une prestation facturée sans coût saisi", () => {
    expect(servicesCost([{ qty: 2, price: 50_000 }]).unknown).toBe(true);
    expect(servicesCost([{ qty: 2, price: 50_000, cost: 0 }]).unknown).toBe(false);
    expect(servicesCost([{ qty: 0, price: 0 }]).unknown).toBe(false);
  });
  it("le panneau plein entre dans le prix de revient d'un ouvrage", () => {
    const pleine = win({ category: "porte", opening: "ouvrant", leaves: 1, infill: "pleine", width: 900, height: 2100 });
    const cheap = costLine(pleine, withS({ market: { ...S.market, panel: 0 } }));
    expect(costLine(pleine, S).material).toBeGreaterThan(cheap.material);
  });
});

describe("étalonnage des réglages", () => {
  it("signale les valeurs d'exemple, puis les prix non datés ou anciens", () => {
    expect(calibration(S)).toEqual(["market", "tariffs"]);
    expect(calibration(withS({ pricing: "cost" }))).toEqual(["market", "labor"]);
    const own = withS({ market: { ...S.market, offers: { ...S.market.offers, "pf.dormant": [{ length: 6000, price: 99000 }] } } });
    expect(calibration(own)).toContain("stale"); // personnalisé mais jamais daté
    const now = Date.parse("2026-10-29");
    expect(calibration({ ...own, market: { ...own.market, priceDate: "2026-10-01" } }, now)).not.toContain("stale");
    expect(calibration({ ...own, market: { ...own.market, priceDate: "2026-05-01" } }, now)).toContain("stale");
  });
});

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
