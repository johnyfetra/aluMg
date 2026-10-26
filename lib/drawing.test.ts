import { describe, expect, it } from "vitest";
import { type Drawable, drawingSvg } from "./drawing";
import { type Direction, type LeafMode, leafMarks, leafMotion, lineMarks, CATEGORIES, EXTRAS, FINISHES, GLASSES, GUARDS, OPENINGS, PATTERNS, RANGES, SHUTTERS, THICKNESSES, CONTROLS, INFILLS } from "./model";

// Le PDF convertit le SVG en image : un attribut en double ou une balise mal formée fait échouer toute la génération.
function problems(svg: string): string[] {
  const out: string[] = [];
  if (!svg.startsWith("<svg") || !svg.endsWith("</svg>")) out.push("enveloppe");
  if (/NaN|undefined|Infinity/.test(svg)) out.push("valeur invalide");
  for (const m of svg.matchAll(/<([a-zA-Z]+)\s([^>]*?)\/?>/g)) {
    const names = [...m[2].matchAll(/(?:^|\s)([a-zA-Z:-]+)=/g)].map((a) => a[1]);
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) out.push(`attribut en double « ${dup} » dans <${m[1]}>`);
  }
  const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  if (new Set(ids).size !== ids.length) out.push("id en double");
  return out;
}

describe("drawingSvg", () => {
  const base: Drawable = { category: "fenetre", opening: "coulissant", leaves: 2, shutter: "roulant", control: "manuel", guard: "barreaudage", infill: "vitree", finish: "blanc", glassType: "clair", thickness: "5", pattern: "none", range: "asiatique", extras: [], width: 1200, height: 1000 };

  it("produit un SVG bien formé pour toutes les combinaisons de configuration", () => {
    let n = 0;
    for (const category of CATEGORIES)
      for (const opening of OPENINGS)
        for (const range of RANGES)
          for (const glassType of GLASSES.map((g) => g.id))
            for (const pattern of PATTERNS) {
              const l: Drawable = { ...base, category, opening, range, glassType, pattern, leaves: category === "cloison" ? 4 : 3, extras: [...EXTRAS], guard: GUARDS[n % 2], thickness: THICKNESSES[n % THICKNESSES.length], finish: FINISHES[n % FINISHES.length].id, shutter: SHUTTERS[n % 2], control: CONTROLS[n % 2], infill: INFILLS[n % 3] };
              const { svg } = drawingSvg(l, "t" + n);
              expect(problems(svg), JSON.stringify(l)).toEqual([]);
              n++;
            }
    expect(n).toBeGreaterThan(1000);
  });

  it("reflète les choix : gamme, motif, verre, options, nombre de vantaux", () => {
    const has = (over: object, text: string) => expect(drawingSvg({ ...base, ...over }, "x").svg).toContain(text);
    has({ range: "europeen" }, 'stroke-width="1.6"'); // rupture de pont thermique (gamme européenne seulement)
    expect(drawingSvg(base, "x").svg).not.toContain('stroke-width="1.6"');
    has({ pattern: "granite" }, 'id="ptx"');
    has({ glassType: "reflechissant" }, 'id="rfx"');
    has({ glassType: "feuillete" }, "stroke-dasharray");
    has({ thickness: "4/12/4" }, 'stroke-opacity=".5"');
    has({ extras: ["moustiquaire"] }, 'id="msx"');
    expect((drawingSvg({ ...base, leaves: 6, width: 4800 }, "x").svg.match(/→|←|M[\d.]+,[\d.]+ L/g) ?? []).length).toBeGreaterThanOrEqual(6);
  });

  it("deux dessins sur une même page n'entrent pas en collision d'identifiants", () => {
    const a = drawingSvg({ ...base, pattern: "granite" }, "aaa").svg;
    const b = drawingSvg({ ...base, pattern: "granite" }, "bbb").svg;
    expect(a).toContain('id="ptaaa"');
    expect(b).toContain('id="ptbbb"');
  });
});

describe("sens d'ouverture", () => {
  const slide = (leaves: number, direction?: Direction) => leafMotion({ opening: "coulissant", leaves, direction }).map((m) => m.slide);

  it("coulissant : les vantaux mobiles glissent du côté choisi (gauche par défaut)", () => {
    expect(slide(2)).toEqual([0, -1]);
    expect(slide(2, "right")).toEqual([1, 0]);
    expect(slide(3, "right")).toEqual([1, 0, 0]);
    expect(slide(4, "right")).toEqual([1, 0, 1, 0]);
    expect(slide(2, "both")).toEqual([1, -1]); // double coulissant : les deux côtés s'ouvrent
    expect(slide(4, "both")).toEqual([1, -1, 1, -1]);
  });

  it("battant à un vantail : charnières du côté choisi ; à plusieurs vantaux : aux extrémités", () => {
    const hinge = (leaves: number, direction?: Direction) => leafMotion({ opening: "ouvrant", leaves, direction }).map((m) => m.hingeLeft);
    expect(hinge(1)).toEqual([true]);
    expect(hinge(1, "right")).toEqual([false]);
    expect(hinge(2, "right")).toEqual([true, false]);
  });

  it("le schéma dessine la flèche du côté choisi", () => {
    const base = { category: "fenetre", opening: "coulissant", leaves: 2, shutter: "roulant", control: "manuel", guard: "barreaudage", infill: "vitree", finish: "blanc", glassType: "clair", thickness: "5", pattern: "none", range: "asiatique", extras: [] as never[], width: 1200, height: 1000 } as const;
    const arrow = (d: Direction) => drawingSvg({ ...base, direction: d }, "x").svg.match(/stroke-width="1.4"/g)?.length;
    expect(arrow("left")).toBe(1);
    expect(arrow("right")).toBe(1);
    expect(drawingSvg({ ...base, direction: "both" }, "x").svg.match(/stroke-width="1.4"/g)?.length).toBe(2);
    expect(drawingSvg({ ...base, direction: "left" }, "x").svg).not.toBe(drawingSvg({ ...base, direction: "right" }, "x").svg);
  });

  it("parties fixes choisies vantail par vantail, avec repères V1 / F1", () => {
    const l = { category: "fenetre", opening: "coulissant", leaves: 3, leafCfg: ["F", "L", "F"] as LeafMode[] } as const;
    expect(leafMotion(l).map((m) => m.slide)).toEqual([0, -1, 0]);
    expect(leafMarks(l)).toEqual(["F1", "V1", "F2"]);
    // un vantail qui n'a pas de voisin du côté choisi ne peut pas coulisser : il reste fixe
    expect(leafMotion({ ...l, leafCfg: ["L", "F", "R"] }).map((m) => m.slide)).toEqual([0, 0, 0]);
    // deux vantaux qui viennent l'un vers l'autre se partagent la course
    expect(leafMotion({ ...l, leaves: 2, leafCfg: ["R", "L"] }).map((m) => m.travel)).toEqual([0.5, 0.5]);
  });

  it("battant : un vantail fixe n'a pas de mouvement ni de charnière dessinée", () => {
    // double sens (va-et-vient) : vantail mobile, deux triangles d'ouverture dans le schéma
    const door = { category: "porte", opening: "ouvrant", leaves: 2, leafCfg: ["B", "B"] as LeafMode[] } as const;
    expect(leafMotion(door).map((m) => [m.fixed, m.both])).toEqual([[false, true], [false, true]]);
    const l = { category: "fenetre", opening: "ouvrant", leaves: 2, leafCfg: ["F", "R"] as LeafMode[] } as const;
    expect(leafMotion(l).map((m) => m.fixed)).toEqual([true, false]);
    expect(leafMarks(l)).toEqual(["F1", "V1"]);
  });

  it("repères d'ouvrage par catégorie", () => {
    expect(lineMarks([{ category: "fenetre" }, { category: "porte" }, { category: "fenetre" }])).toEqual(["F-01", "P-01", "F-02"]);
  });
});
