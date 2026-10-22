import { describe, expect, it } from "vitest";
import { accessoriesFor, cutList, cuttingPlan, normalize, planTotals, surchargeKeys, unitPrice } from "./calc";
import { drawingSvg } from "./drawing";
import { CATEGORIES, DEFAULT_SETTINGS, GUARDS, INFILLS, type Line, OPENINGS_BY_CATEGORY, SHUTTERS, leafMarks, leafMotion, leavesSpec, lineSchema } from "./model";

const base: Line = {
  id: "00000000-0000-4000-8000-000000000000",
  category: "fenetre", opening: "coulissant", leaves: 2, shutter: "roulant", control: "manuel", guard: "barreaudage", range: "asiatique",
  finish: "blanc", infill: "vitree", glassType: "clair", thickness: "5", pattern: "none", extras: [],
  width: 1200, height: 1000, qty: 1, unit: 0,
};
const { tariffs, surcharges, minArea } = DEFAULT_SETTINGS;
const price = (l: Partial<Line>) => unitPrice({ ...base, ...l }, tariffs, surcharges, minArea);

describe("cutList", () => {
  it("coulissant 2 vantaux 1200x1000", () => {
    const { pieces, glass } = cutList(base);
    expect(pieces).toContainEqual({ profile: "pf.sash", element: "el.sashH", len: 620, qty: 4 });
    expect(pieces).toContainEqual({ profile: "pf.sash", element: "el.sashV", len: 950, qty: 4 });
    expect(glass).toEqual([{ w: 550, h: 880, qty: 2 }]);
  });
  it("3 et 4 vantaux : plus de pièces, vantaux plus étroits", () => {
    const l3 = cutList({ ...base, leaves: 3, width: 2400 });
    expect(l3.pieces).toContainEqual({ profile: "pf.sash", element: "el.sashH", len: 827, qty: 6 });
    expect(l3.glass[0].qty).toBe(3);
    expect(cutList({ ...base, leaves: 4, width: 3000 }).pieces).toContainEqual({ profile: "pf.sash", element: "el.sashV", len: 950, qty: 8 });
  });
  it("ouvrant 2 vantaux ajoute un battement central", () => {
    const { pieces } = cutList({ ...base, opening: "ouvrant", leaves: 2 });
    expect(pieces).toContainEqual({ profile: "pf.battement", element: "el.battement", len: 970, qty: 1 });
  });
  it("porte pleine : panneaux, pas de verre ; semi-pleine : les deux", () => {
    const pleine = cutList({ ...base, category: "porte", opening: "ouvrant", leaves: 1, height: 2100, width: 900, infill: "pleine" });
    expect(pleine.glass).toHaveLength(0);
    expect(pleine.panels).toHaveLength(1);
    const semi = cutList({ ...base, category: "porte", opening: "ouvrant", leaves: 1, height: 2100, width: 900, infill: "semi" });
    expect(semi.glass).toHaveLength(1);
    expect(semi.panels).toHaveLength(1);
  });
  it("jalousie, fixe, volet roulant et rideau métallique", () => {
    expect(cutList({ ...base, opening: "jalousie", leaves: 1 }).glass[0].h).toBe(100);
    expect(cutList({ ...base, opening: "fixe", leaves: 1 }).glass).toEqual([{ w: 1140, h: 940, qty: 1 }]);
    expect(cutList({ ...base, category: "volet", height: 1480 }).pieces.find((p) => p.profile === "pf.slat")?.qty).toBe(40);
    expect(cutList({ ...base, category: "volet", shutter: "rideau" }).pieces.some((p) => p.profile === "pf.slatR")).toBe(true);
  });
});

describe("nouvelles catégories et nombre de vantaux libre", () => {
  it("coulissant à 6 vantaux : 6 vitrages, 12 traverses", () => {
    const c = cutList({ ...base, leaves: 6, width: 4800 });
    expect(c.glass[0].qty).toBe(6);
    expect(c.pieces.find((p) => p.element === "el.sashH")?.qty).toBe(12);
  });
  it("ouvrant à 4 vantaux : 2 battements ; naco : lames de verre", () => {
    expect(cutList({ ...base, opening: "ouvrant", leaves: 4, width: 2400 }).pieces.find((p) => p.element === "el.battement")?.qty).toBe(2);
    expect(cutList({ ...base, opening: "jalousie", leaves: 1 }).pieces.some((p) => p.profile === "pf.louvre")).toBe(true);
  });
  it("garde-corps : un poteau tous les 1,2 m, barreaux ou verre selon le type", () => {
    const bar = cutList({ ...base, category: "garde-corps", width: 3000, height: 1000, guard: "barreaudage" });
    expect(bar.pieces.find((p) => p.profile === "pf.post")?.qty).toBe(4);
    expect(bar.pieces.find((p) => p.profile === "pf.bar")?.qty).toBe(25);
    expect(bar.glass).toHaveLength(0);
    const glassy = cutList({ ...base, category: "garde-corps", width: 3000, height: 1000, guard: "verre" });
    expect(glassy.glass[0].qty).toBe(3);
    expect(glassy.pieces.some((p) => p.profile === "pf.bar")).toBe(false);
  });
  it("cloison : n panneaux, n-1 meneaux", () => {
    const c = cutList({ ...base, category: "cloison", leaves: 4, width: 4000, height: 2400 });
    expect(c.glass[0].qty).toBe(4);
    expect(c.pieces.find((p) => p.profile === "pf.mullion")?.qty).toBe(3);
  });
  it("le nombre de vantaux reste dans la plage de l'ouverture", () => {
    expect(normalize({ ...base, leaves: 99 }).leaves).toBe(8);
    expect(normalize({ ...base, opening: "oscillo", leaves: 9 }).leaves).toBe(4);
    expect(normalize({ ...base, category: "cloison", leaves: 0 }).leaves).toBe(1);
    expect(normalize({ ...base, opening: "jalousie", leaves: 5 }).leaves).toBe(1);
  });
});

describe("cuttingPlan", () => {
  const piece = (len: number, qty: number, element: "el.sashH" | "el.sashV" = "el.sashH", line = 1) => ({ profile: "pf.sash" as const, element, len, qty, line });
  it("regroupe les coupes sur une barre en comptant le trait de scie", () => {
    expect(cuttingPlan([piece(1990, 3)])[0].bars).toHaveLength(1);
    expect(cuttingPlan([piece(1990, 4)])[0].bars).toHaveLength(2);
  });
  it("calcule longueur utilisée, achetée et perte", () => {
    const [p] = cuttingPlan([piece(2000, 3)]); // 3 x 2000 = 6000 + 3 traits > 6000 : 2 barres
    expect(p.bars).toHaveLength(2);
    expect(p.usedLen).toBe(6000);
    expect(p.totalLen).toBe(12000);
    expect(p.wasteLen).toBe(6000);
    expect(p.wastePct).toBe(50);
    const bar0 = p.bars[0];
    expect(bar0.cuts.reduce((s, c) => s + c, 0) + bar0.cuts.length * 5 + bar0.left).toBe(6000);
  });
  it("garde le détail par élément et par ouvrage", () => {
    const [p] = cuttingPlan([piece(1000, 2, "el.sashH", 1), piece(1000, 4, "el.sashH", 2), piece(800, 2, "el.sashV", 1)]);
    expect(p.elements.find((e) => e.len === 1000)).toMatchObject({ qty: 6, lines: [1, 2] });
    expect(p.elements).toHaveLength(2);
  });
  it("respecte la longueur de barre et le trait de scie réglés", () => {
    expect(cuttingPlan([piece(1490, 4)], 4000, 10)[0].bars).toHaveLength(2); // 2 x 1500 par barre de 4 m
    expect(cuttingPlan([piece(1490, 4)], 6000, 5)[0].bars).toHaveLength(1); // 4 x 1495 = 5980
  });
  it("signale une pièce plus longue que la barre", () => {
    expect(cuttingPlan([piece(6000, 1)])[0].tooLong).toEqual([6000]);
  });
  it("totalise plusieurs profilés", () => {
    const plans = cuttingPlan([piece(2000, 3), { profile: "pf.dormant", element: "el.dormantH", len: 1000, qty: 2 }]);
    const t = planTotals(plans);
    expect(t.bars).toBe(3);
    expect(t.totalLen).toBe(18000);
    expect(t.usedLen).toBe(8000);
    expect(t.wasteLen).toBe(10000);
  });
});

describe("prix", () => {
  const baseline = price({});
  it("surface minimale facturée", () => {
    expect(price({ width: 500, height: 500 })).toBe(tariffs["fenetre.coulissant"]);
  });
  it("gamme européenne : +35 %", () => {
    expect(price({ range: "europeen" })).toBe(Math.round(baseline * 1.35));
  });
  it("les majorations s'additionnent (faux bois +15, feuilleté +25, épaisseur 8 mm +12)", () => {
    expect(price({ finish: "chene-dore", glassType: "feuillete", thickness: "8" })).toBe(Math.round(baseline * 1.52));
  });
  it("une option sans objet ne coûte rien (verre sur une porte pleine, motor sur une fenêtre)", () => {
    const porte = { category: "porte", opening: "ouvrant", leaves: 1, width: 900, height: 2100 } as const;
    expect(price({ ...porte, infill: "pleine", glassType: "feuillete", thickness: "10" })).toBe(price({ ...porte, infill: "pleine" }));
    expect(surchargeKeys({ ...base, control: "motorise" })).toEqual([]);
  });
  it("garde-corps : tarif selon le type, verre seulement sur le garde-corps en verre", () => {
    const gc = { category: "garde-corps", width: 2000, height: 1000 } as const;
    expect(price({ ...gc, guard: "barreaudage", glassType: "feuillete" })).toBe(price({ ...gc, guard: "barreaudage" }));
    expect(price({ ...gc, guard: "verre", glassType: "feuillete" })).toBeGreaterThan(price({ ...gc, guard: "verre" }));
    expect(price({ ...gc, guard: "verre" })).not.toBe(price({ ...gc, guard: "barreaudage" }));
  });
  it("volet motorisé : +45 %", () => {
    const volet = { category: "volet" } as const;
    expect(price({ ...volet, control: "motorise" })).toBe(Math.round(price(volet) * 1.45));
  });
  it("sélecteurs au tarif de la bonne ligne (rideau ≠ roulant)", () => {
    expect(price({ category: "volet", shutter: "rideau" })).not.toBe(price({ category: "volet", shutter: "roulant" }));
  });
});

describe("normalize et validation", () => {
  it("une porte ne peut pas être une jalousie ; les vantaux restent valides", () => {
    const n = normalize({ ...base, category: "porte", opening: "jalousie", leaves: 1 });
    expect(n.opening).toBe("coulissant");
    expect(n.leaves).toBe(2);
    expect(normalize({ ...base, opening: "ouvrant", leaves: 4 }).leaves).toBe(4); // nombre libre dans la plage
  });
  it("le motif est retiré sur un verre qui n'en porte pas", () => {
    expect(normalize({ ...base, glassType: "feuillete", pattern: "granite" }).pattern).toBe("none");
  });
  it("lineSchema refuse des dimensions hors limites", () => {
    expect(lineSchema.safeParse(base).success).toBe(true);
    expect(lineSchema.safeParse({ ...base, width: 100 }).success).toBe(false);
    expect(lineSchema.safeParse({ ...base, width: 7000 }).success).toBe(false);
  });
});

// Parcours exhaustif de ce que le formulaire permet de choisir : aucune combinaison ne doit produire un ouvrage invalide, un prix absurde ou un schéma cassé.
describe("toutes les possibilités par catégorie", () => {
  const combos: Partial<Line>[] = [];
  for (const category of CATEGORIES) {
    const openings = OPENINGS_BY_CATEGORY[category].length ? OPENINGS_BY_CATEGORY[category] : (["fixe"] as const);
    for (const opening of openings) {
      const spec = leavesSpec({ category, opening });
      for (let leaves = spec?.min ?? 1; leaves <= (spec?.max ?? 1); leaves++) {
        for (const shutter of category === "volet" ? SHUTTERS : ["roulant" as const])
          for (const guard of category === "garde-corps" ? GUARDS : ["barreaudage" as const])
            for (const infill of category === "porte" ? INFILLS : ["vitree" as const]) combos.push({ category, opening, leaves, shutter, guard, infill });
      }
    }
  }

  it("chaque combinaison reste valide, a un prix, un débit et un schéma", () => {
    expect(combos.length).toBeGreaterThan(70);
    for (const c of combos) {
      const l = normalize({ ...base, ...c, width: 2400, height: 1500 });
      expect(lineSchema.safeParse(l).success, JSON.stringify(c)).toBe(true);
      expect(price(l), JSON.stringify(c)).toBeGreaterThan(0);
      expect(cutList(l).pieces.length, JSON.stringify(c)).toBeGreaterThan(0);
      expect(drawingSvg(l, "t").svg).not.toMatch(/NaN|undefined/);
    }
  });

  it("repères uniques et cohérents avec le mouvement de chaque vantail", () => {
    for (const c of combos) {
      const l = normalize({ ...base, ...c });
      if (l.category !== "fenetre" && l.category !== "porte") continue;
      const marks = leafMarks(l);
      expect(new Set(marks).size, JSON.stringify(c)).toBe(l.leaves);
      leafMotion(l).forEach((m, i) => expect(marks[i].startsWith(m.fixed ? "F" : "V")).toBe(true));
    }
  });
});

describe("accessoires", () => {
  const acc = (l: Partial<Line>) => Object.fromEntries(accessoriesFor({ ...base, ...l }).map((a) => [a.key, a.qty]));
  it("coulissant 2 vantaux : 1 vantail mobile = 2 galets et 1 fermeture", () => {
    expect(acc({})).toMatchObject({ "acc.roller": 2, "acc.sliderLock": 1 });
  });
  it("porte ouvrante : charnières, serrure, poignée et pommeau par vantail", () => {
    expect(acc({ category: "porte", opening: "ouvrant", leaves: 1, height: 2100, width: 900 })).toMatchObject({ "acc.hinge": 3, "acc.lock": 1, "acc.doorHandle": 1, "acc.knob": 1 });
  });
  it("volet : moteur si motorisé, manivelle sinon ; garde-corps : platines", () => {
    expect(acc({ category: "volet", control: "motorise" })).toEqual({ "acc.motor": 1 });
    expect(acc({ category: "volet", control: "manuel" })).toEqual({ "acc.crank": 1 });
    expect(acc({ category: "garde-corps", width: 3000 })["acc.plate"]).toBe(8);
  });
});
