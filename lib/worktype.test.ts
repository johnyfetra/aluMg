import { describe, expect, it } from "vitest";
import { cutList, nacoBlades, normalize } from "./calc";
import { drawingSvg } from "./drawing";
import { lineDetails } from "./describe";
import { FINISHES, lineSchema, splitOf, standardSizes, workPatch, workType, WORK_TYPES } from "./model";

const line = lineSchema.parse({ id: "x", category: "fenetre", opening: "coulissant", leaves: 2, shutter: "roulant", control: "manuel", range: "asiatique", finish: "blanc", infill: "vitree", glassType: "clair", thickness: "5", pattern: "none", extras: [], width: 1200, height: 1000, qty: 1, unit: 1 });
const t = ((k: string) => k) as never;

describe("types d'ouvrage", () => {
  it("chaque type se retrouve après application : le naco et le rideau métallique sont des types à part", () => {
    for (const w of WORK_TYPES) expect(workType(normalize({ ...line, ...workPatch(w, line) }))).toBe(w);
  });
  it("de naco à fenêtre, l'ouverture redevient coulissante ; une fenêtre ouvrante le reste", () => {
    const naco = normalize({ ...line, ...workPatch("naco", line) });
    expect(naco).toMatchObject({ category: "fenetre", opening: "jalousie", leaves: 1 });
    expect(workPatch("fenetre", naco)).toMatchObject({ opening: "coulissant" });
    expect(workPatch("fenetre", { category: "fenetre", opening: "ouvrant" })).toMatchObject({ opening: "ouvrant" });
  });
  it("le rideau métallique est un volet à tablier de rideau", () => {
    expect(normalize({ ...line, ...workPatch("rideau", line) })).toMatchObject({ category: "volet", shutter: "rideau", slat: "pleine" });
  });
});

describe("tailles standard", () => {
  it("porte battante : 2,10 m, un vantail de 70 à 100 cm ou deux battants de 140 à 200 cm ; porte coulissante : de 2 à 4 vantaux", () => {
    expect(standardSizes({ category: "porte", opening: "ouvrant" }).map((z) => [z.w, z.h, z.leaves])).toEqual([[700, 2100, 1], [800, 2100, 1], [900, 2100, 1], [1000, 2100, 1], [1400, 2100, 2], [1600, 2100, 2], [1800, 2100, 2], [2000, 2100, 2]]);
    expect(standardSizes({ category: "porte", opening: "coulissant" }).map((z) => [z.w, z.leaves])).toEqual([[1500, 2], [1800, 2], [2000, 2], [2400, 3], [3000, 3], [3600, 4]]);
    expect(standardSizes({ category: "porte", opening: "fixe" })).toEqual([]);
    expect(standardSizes({ category: "volet", opening: "fixe" })).toEqual([]);
  });
  it("chaque taille standard est une taille valide de l'ouvrage", () => {
    for (const cat of ["fenetre", "porte"] as const) for (const z of standardSizes({ category: cat, opening: "ouvrant" })) expect(lineSchema.safeParse({ ...line, category: cat, opening: "ouvrant", width: z.w, height: z.h }).success).toBe(true);
  });
});

describe("série de profilé", () => {
  it("figure dans la description de l'ouvrage, entre la gamme et la couleur", () => {
    expect(lineDetails({ ...line, series: "K56 Max" }, t)[0]).toBe("range.asiatique · K56 Max · finish.blanc");
    expect(lineDetails(line, t)[0]).toBe("range.asiatique · finish.blanc");
  });
});

describe("naco : lames calculées d'après la hauteur", () => {
  it("une seule règle : 100 mm par lame, 40 mm de jeu, jamais moins d'une lame", () => {
    expect(nacoBlades(1000)).toBe(10);
    expect(nacoBlades(1040)).toBe(10);
    expect(nacoBlades(1041)).toBe(11);
    expect(nacoBlades(200)).toBe(2);
    expect(nacoBlades(0)).toBe(1);
  });
  it("la liste de coupe, le schéma et la description suivent la hauteur", () => {
    const naco = normalize({ ...line, opening: "jalousie", width: 600, height: 1200 });
    expect(cutList(naco).glass).toEqual([{ w: 560, h: 100, qty: nacoBlades(1200) }]);
    expect(cutList({ ...naco, height: 1500 }).glass[0].qty).toBe(15);
    expect(lineDetails(naco, t)).toContain(`${nacoBlades(1200)} naco.blades`);
    expect((drawingSvg(naco, "t", 360, 280).svg.match(/<rect/g) ?? []).length).toBeGreaterThan(nacoBlades(1200)); // un rectangle par lame, plus le cadre
  });
});

describe("séparateur de porte et teintes de faux bois", () => {
  const door = lineSchema.parse({ id: "d", category: "porte", opening: "ouvrant", leaves: 1, shutter: "roulant", control: "manuel", range: "asiatique", finish: "blanc", infill: "traverse", glassType: "clair", thickness: "5", pattern: "none", extras: [], width: 900, height: 2100, qty: 1, unit: 1 });
  it("la position du séparateur se choisit : milieu par défaut (traverse), 60 % pour une demi-vitrée", () => {
    expect(splitOf({ infill: "traverse" })).toBe(0.5);
    expect(splitOf({ infill: "semi" })).toBe(0.6);
    expect(splitOf({ infill: "traverse", splitAt: 0.4 })).toBe(0.4);
    expect(lineSchema.safeParse({ ...door, splitAt: 0.9 }).success).toBe(false); // hors bornes : refusé
  });
  it("la liste de coupe suit la position : deux vitrages dont la somme ne change pas", () => {
    const heights = (splitAt?: number) => cutList(normalize({ ...door, splitAt })).glass.map((g) => g.h);
    const mid = heights();
    const low = heights(0.4);
    expect(mid[0] + mid[1]).toBe(low[0] + low[1]);
    expect(low[0]).toBeLessThan(mid[0]);
  });
  it("le faux bois propose plusieurs teintes, toutes distinctes", () => {
    const wood = FINISHES.filter((f) => f.group === "fauxbois");
    expect(wood.length).toBeGreaterThanOrEqual(9);
    expect(new Set(wood.map((f) => f.hex)).size).toBe(wood.length);
    expect(wood.map((f) => f.id)).toEqual(expect.arrayContaining(["teck", "wenge", "cerisier", "chene-fonce", "chene-gris"]));
  });
});
