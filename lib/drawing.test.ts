import { describe, expect, it } from "vitest";
import { type Drawable, drawingSvg } from "./drawing";
import { CATEGORIES, EXTRAS, FINISHES, GLASSES, GUARDS, OPENINGS, PATTERNS, RANGES, SHUTTERS, THICKNESSES, CONTROLS, INFILLS } from "./model";

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
