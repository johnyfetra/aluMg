import { describe, expect, it } from "vitest";
import { analyze, toLine } from "./intake";

// Corpus de demandes « comme les écrivent vraiment les clients » : fautes, SMS, majuscules, sans accents, listes, plusieurs ouvrages.
// Chaque ligne : texte → résumé attendu des ouvrages « catégorie/ouverture/L×H/quantité/couleur[/gamme] » ("-" : non précisé).
const sum = (t: string) => analyze(t).items.map((i) => { const s = i.spec; return [s.category, s.opening ?? "-", s.width && !i.assumptions.includes("size") ? `${s.width}x${s.height}` : "-", s.qty, s.finish ?? "-", ...(s.range ? [s.range] : [])].join("/"); });
const CASES: [string, string[]][] = [
  ["Bonjour, je veux 2 fenêtres coulissantes 1,5m x 1,2m blanches svp", ["fenetre/coulissant/1500x1200/2/blanc"]],
  ["BONJOUR 3 FENETRES 120X100 NOIR", ["fenetre/coulissant/1200x1000/3/noir"]],
  ["fenetre oscillo battante 100x130 gris anthracite", ["fenetre/oscillo/1000x1300/1/anthracite"]],
  ["une porte d entrée 90 x 210 marron", ["porte/ouvrant/900x2100/1/marron"]],
  ["porte fenetre 2,2 m par 2,1 m coulissante bronze", ["porte/coulissant/2200x2100/1/bronze"]],
  ["je voudrais une baie vitrée de 3 mètres de large et 2,2 m de haut noire", ["fenetre/coulissant/3000x2200/1/noir"]],
  ["2 volets roulants electriques 150x140 blancs", ["volet/-/1500x1400/2/blanc"]],
  ["volet roulant manuel 1m20 x 1m40", ["volet/-/1200x1400/1/-"]],
  ["garde-corps verre 4 m", ["garde-corps/-/-/1/-"]],
  ["rideau metallique garage 3m x 2m50 anthracite", ["volet/-/3000x2500/1/anthracite"]],
  ["cloison vitrée de 3,6 m sur 2,4 m en noir", ["cloison/-/3600x2400/1/noir"]],
  ["un naco 60x80 pour les wc", ["fenetre/jalousie/600x800/1/-"]],
  ["3 fenêtres 150x120 blanches pour les chambres et 1 porte 90x210 noire", ["fenetre/coulissant/1500x1200/3/blanc", "porte/ouvrant/900x2100/1/noir"]],
  ["Il me faut :\n- 2 fenêtres 100x100 blanc\n- 1 porte 80x200 marron\n- 3 volets 120x130", ["fenetre/coulissant/1000x1000/2/blanc", "porte/ouvrant/800x2000/1/marron", "volet/-/1200x1300/3/-"]],
  ["fenetre 1mx1m blanc norme europeenne", ["fenetre/coulissant/1000x1000/1/blanc/europeen"]],
  ["2 fenetres coulissantes europeennes 150x120", ["fenetre/coulissant/1500x1200/2/-/europeen"]],
  ["fenêtre en aluminium, couleur chêne doré, 140x110", ["fenetre/coulissant/1400x1100/1/chene-dore"]],
  ["porte pleine marron 90x210 et fenetre fixe 80x80 marron", ["porte/ouvrant/900x2100/1/marron", "fenetre/fixe/800x800/1/marron"]],
  ["2 fenetres blanches 120x100 et 2 marron 150x120", ["fenetre/coulissant/1200x1000/2/blanc", "fenetre/coulissant/1500x120/2/marron"].map((x) => x.replace("120/", "1200/").replace("1500x120/", "1500x1200/"))],
  ["fenetre 100 x 120 blanche x3", ["fenetre/coulissant/1000x1200/3/blanc"]],
  ["quatre fenetres 1m x 1m", ["fenetre/coulissant/1000x1000/4/-"]],
];

describe("corpus de demandes réelles", () => {
  for (const [text, expected] of CASES) it(text.replace(/\n/g, " ⏎ ").slice(0, 70), () => expect(sum(text)).toEqual(expected));
  it("jamais d'exception ni de cote hors limites, sur du texte quelconque", () => {
    const junk = ["", "   ", "???", "1234567890", "fenetre ".repeat(200), "x".repeat(5000), "porte 99999999 x 0", "volet -5m x 1e9", "🙂 fenêtre 🙂 120x100 🙂", "garde-corps ".repeat(40) + "3m"];
    for (const t of junk) for (const i of analyze(t).items) {
      const l = toLine(i.spec);
      expect(l.width).toBeGreaterThanOrEqual(200);
      expect(l.width).toBeLessThanOrEqual(6000);
      expect(l.qty).toBeGreaterThanOrEqual(1);
    }
  });
  it("reste rapide : un texte de 6 000 caractères s'analyse en moins de 150 ms", () => {
    const text = "Bonjour, je veux 3 fenêtres coulissantes 150x120 blanches pour les chambres, une porte d'entrée noire 90x210 et un volet roulant motorisé. ".repeat(45);
    const t0 = performance.now();
    analyze(text);
    expect(performance.now() - t0).toBeLessThan(150);
  });
});
