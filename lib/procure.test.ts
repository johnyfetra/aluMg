import { describe, expect, it } from "vitest";
import { type Piece, allPieces } from "./calc";
import { DEFAULT_MARKET, type Line, type Market } from "./model";
import { extrasCost, initSim, planGroup, priced, procure, simulate } from "./procure";

const piece = (len: number, qty: number, line = 1, over: Partial<Piece> = {}): Piece => ({ profile: "pf.sash", element: "el.sashH", len, qty, line, range: "asiatique", finish: "blanc", ...over });
const market = (offers: { length: number; price: number }[], extra: Partial<Market> = {}): Market => ({ ...DEFAULT_MARKET, offers: { ...DEFAULT_MARKET.offers, "pf.sash": offers }, ...extra });

describe("planGroup", () => {
  it("une seule offre : autant de barres que nécessaire", () => {
    const { bars } = planGroup([2000, 2000, 2000], [{ length: 6000, price: 100 }], 5);
    expect(bars).toHaveLength(2); // 3 x 2005 > 6000
    expect(bars.reduce((s, b) => s + b.price, 0)).toBe(200);
  });
  it("plusieurs longueurs : choisit le mélange le moins cher", () => {
    // 2 x 2500 : une barre de 6 m à 100 ou deux barres de 3 m à 40 = 80
    const { bars } = planGroup([2500, 2500], [{ length: 6000, price: 100 }, { length: 3000, price: 40 }], 5);
    expect(bars.map((b) => b.length)).toEqual([3000, 3000]);
    expect(bars.reduce((s, b) => s + b.price, 0)).toBe(80);
  });
  it("redimensionne la dernière barre à l'offre la moins chère qui convient", () => {
    // 6000 + 1000 : une barre de 6 m (pleine) ne peut pas porter les 2 ; le reste (1000) va sur une barre de 2 m moins chère qu'une de 6 m
    const { bars } = planGroup([5900, 1000], [{ length: 6000, price: 100 }, { length: 2000, price: 30 }], 5);
    expect(bars.map((b) => b.length).sort()).toEqual([2000, 6000]);
    expect(bars.reduce((s, b) => s + b.price, 0)).toBe(130);
  });
  it("une barre plus chère mais plus longue peut éviter une barre de plus", () => {
    const { bars } = planGroup([3000, 3000], [{ length: 6100, price: 110 }, { length: 3100, price: 70 }], 5);
    expect(bars.reduce((s, b) => s + b.price, 0)).toBe(110); // 1 x 6,1 m plutôt que 2 x 3,1 m = 140
  });
  it("signale les pièces plus longues que toute barre du marché", () => {
    const r = planGroup([7000, 1000], [{ length: 6000, price: 100 }], 5);
    expect(r.tooLong).toEqual([7000]);
    expect(r.bars).toHaveLength(1);
  });
  it("sans offre : aucune barre, tout est signalé", () => {
    expect(planGroup([1000], [], 5)).toEqual({ bars: [], tooLong: [1000] });
  });
});

describe("priced", () => {
  it("applique les majorations de gamme et de couleur", () => {
    const m = market([{ length: 6000, price: 100000 }]);
    expect(priced(m.offers["pf.sash"], m, "asiatique", "blanc")[0].price).toBe(100000);
    expect(priced(m.offers["pf.sash"], m, "europeen", "blanc")[0].price).toBe(140000);
    expect(priced(m.offers["pf.sash"], m, "asiatique", "chene-dore")[0].price).toBe(130000);
    expect(priced(m.offers["pf.sash"], m, "europeen", "naturel")[0].price).toBe(152000);
  });
});

describe("procure", () => {
  it("sépare les achats par gamme et par couleur", () => {
    const r = procure([piece(1000, 2, 1), piece(1000, 2, 2, { range: "europeen" }), piece(1000, 2, 3, { finish: "noir" })], market([{ length: 6000, price: 100 }]), 5);
    expect(r.groups).toHaveLength(3);
    expect(r.bars).toBe(3);
  });
  it("mutualise les barres entre ouvrages du même profilé et indique lesquels", () => {
    const r = procure([piece(2000, 2, 1), piece(1500, 2, 2)], market([{ length: 6000, price: 100 }]), 5);
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0].lines).toEqual([1, 2]);
    expect(r.bars).toBe(2); // 2x2000 + 2x1500 = 7000 > 6000 : 2 barres
  });
  it("répartit le coût exactement entre les ouvrages", () => {
    const r = procure([piece(2000, 2, 1), piece(1500, 2, 2), piece(900, 3, 3)], market([{ length: 6000, price: 99999 }]), 5);
    const sum = Object.values(r.byLine).reduce((s, l) => s + l.cost, 0);
    expect(Math.abs(sum - r.totalCost)).toBeLessThanOrEqual(2); // arrondis
    expect(r.byLine[1].usedLen).toBe(4000);
  });
  it("totaux : acheté = utilisé + perdu", () => {
    const r = procure([piece(2500, 5)], market([{ length: 6000, price: 100 }, { length: 3000, price: 45 }]), 5);
    expect(r.totalLen).toBe(r.usedLen + r.wasteLen);
    expect(r.totalCost).toBe(r.groups.reduce((s, g) => s + g.cost, 0));
  });
  it("fonctionne de bout en bout avec un ouvrage réel", () => {
    const line: Line = {
      id: "00000000-0000-4000-8000-000000000000", category: "fenetre", opening: "coulissant", leaves: 2, shutter: "roulant", control: "manuel", guard: "barreaudage",
      range: "europeen", finish: "blanc", infill: "vitree", glassType: "clair", thickness: "5", pattern: "none", extras: [], width: 1200, height: 1000, qty: 3, unit: 0,
    };
    const r = procure(allPieces([line]), DEFAULT_MARKET, 5);
    expect(r.groups.map((g) => g.profile).sort()).toEqual(["pf.dormant", "pf.sash"]);
    expect(r.totalCost).toBeGreaterThan(0);
    expect(r.groups.every((g) => g.tooLong.length === 0)).toBe(true);
  });
});

describe("simulate (hypothèses du menuisier)", () => {
  const line: Line = {
    id: "00000000-0000-4000-8000-000000000001", category: "fenetre", opening: "coulissant", leaves: 2, shutter: "roulant", control: "manuel", guard: "barreaudage",
    range: "asiatique", finish: "blanc", infill: "vitree", glassType: "clair", thickness: "5", pattern: "none", extras: [], width: 1200, height: 1000, qty: 3, unit: 0,
  };
  const base = simulate([line], initSim(DEFAULT_MARKET), 5);

  it("sans hypothèse, donne le même plan que le marché enregistré", () => {
    expect(base.totalCost).toBe(procure(allPieces([line]), DEFAULT_MARKET, 5).totalCost);
  });
  it("une variation de prix de +20 % augmente le coût d'autant, sans changer les barres", () => {
    const up = simulate([line], { ...initSim(DEFAULT_MARKET), pct: 20 }, 5);
    expect(up.bars).toBe(base.bars);
    expect(up.totalCost / base.totalCost).toBeCloseTo(1.2, 1);
  });
  it("gamme européenne et couleur imposées renchérissent ; une barre plus courte change le plan", () => {
    expect(simulate([line], { ...initSim(DEFAULT_MARKET), range: "europeen" }, 5).totalCost).toBeGreaterThan(base.totalCost);
    expect(simulate([line], { ...initSim(DEFAULT_MARKET), finish: "chene-dore" }, 5).totalCost).toBeGreaterThan(base.totalCost);
    const short = { ...DEFAULT_MARKET, offers: Object.fromEntries(Object.entries(DEFAULT_MARKET.offers).map(([k, o]) => [k, [{ length: 3000, price: o[0].price / 2 }]])) };
    expect(simulate([line], { ...initSim(short) }, 5).bars).toBeGreaterThan(base.bars);
  });
});

describe("accessoires et verre dans le budget", () => {
  const line: Line = {
    id: "00000000-0000-4000-8000-000000000002", category: "fenetre", opening: "coulissant", leaves: 2, shutter: "roulant", control: "manuel", guard: "barreaudage",
    range: "asiatique", finish: "blanc", infill: "vitree", glassType: "clair", thickness: "5", pattern: "none", extras: [], width: 1200, height: 1000, qty: 2, unit: 0,
  };
  it("compte les accessoires × quantité et chiffre le verre au m²", () => {
    const e = extrasCost([line], DEFAULT_MARKET);
    expect(e.acc.find((a) => a.key === "acc.roller")?.qty).toBe(4);
    expect(e.accCost).toBeGreaterThan(0);
    expect(e.glassArea).toBeGreaterThan(1);
    expect(e.glassCost).toBeCloseTo(e.glassArea * 70000, -3);
  });
  it("le double vitrage coûte le double ; une variation de prix touche aussi les accessoires", () => {
    const single = extrasCost([line], DEFAULT_MARKET).glassCost;
    expect(extrasCost([{ ...line, thickness: "4/12/4" }], DEFAULT_MARKET).glassCost).toBeCloseTo(single * 2, -3);
    expect(extrasCost([line], DEFAULT_MARKET, 10).accCost).toBeGreaterThan(extrasCost([line], DEFAULT_MARKET).accCost);
  });
  it("le coût total additionne profilés, accessoires et verre", () => {
    const p = simulate([line], initSim(DEFAULT_MARKET), 5);
    expect(p.allCost).toBe(p.totalCost + p.accCost + p.glassCost);
  });
});
