import { describe, expect, it } from "vitest";
import { analyze, questions, toLine } from "./intake";

const one = (t: string) => {
  const r = analyze(t);
  expect(r.items).toHaveLength(1);
  return r.items[0];
};

describe("assistant de demande de devis : comprendre un texte libre", () => {
  it("fenêtre coulissante avec cotes en cm, couleur et quantité", () => {
    const i = one("Je voudrais 3 fenêtres coulissantes de 150x120 en anthracite pour les chambres");
    expect(i.spec).toMatchObject({ category: "fenetre", opening: "coulissant", qty: 3, width: 1500, height: 1200, finish: "anthracite", room: "Chambre" });
    expect(i.assumptions).not.toContain("size");
    expect(i.assumptions).not.toContain("qty"); // « 3 fenêtres » : la quantité est écrite
    expect(i.confidence).toBeGreaterThan(0.8);
  });
  it("plusieurs ouvrages dans une phrase, avec quantités en lettres", () => {
    const r = analyze("Il me faut deux fenêtres 120 x 100 blanches, une porte d'entrée 90x210 noire et un volet roulant motorisé 2,4 m x 2 m pour le salon");
    expect(r.items.map((i) => i.spec.category)).toEqual(["fenetre", "porte", "volet"]);
    expect(r.items[0].spec).toMatchObject({ qty: 2, width: 1200, height: 1000, finish: "blanc" });
    expect(r.items[1].spec).toMatchObject({ qty: 1, width: 900, height: 2100, finish: "noir" });
    expect(r.items[2].spec).toMatchObject({ control: "motorise", width: 2400, height: 2000, room: "Salon" });
  });
  it("une porte reste plus haute que large même si les cotes sont écrites à l'envers", () => {
    expect(one("porte 210x90").spec).toMatchObject({ width: 900, height: 2100 });
  });
  it("unités et écritures variées : mètres, 1m80, largeur / hauteur nommées", () => {
    expect(one("fenêtre de 1,5 m par 1,2 m").spec).toMatchObject({ width: 1500, height: 1200 });
    expect(one("baie vitrée largeur 3 m hauteur 2,2 m").spec).toMatchObject({ category: "fenetre", width: 3000, height: 2200 });
    expect(one("fenêtre 2m x 1m20").spec).toMatchObject({ width: 2000, height: 1200 });
    expect(one("fenêtre 1800mm x 1200mm").spec).toMatchObject({ width: 1800, height: 1200 });
  });
  it("sans cotes : valeurs par défaut signalées et question posée", () => {
    const r = analyze("une fenêtre coulissante pour la cuisine");
    expect(r.items[0].assumptions).toContain("size");
    expect(r.items[0].confidence).toBeLessThan(0.7);
    expect(questions(r)).toEqual([{ key: "size", item: 0 }]);
  });
  it("garde-corps verre feuilleté, longueur en mètres", () => {
    expect(one("garde-corps en verre feuilleté de 3 mètres pour la terrasse").spec).toMatchObject({ category: "garde-corps", guard: "verre", glassType: "feuillete", width: 3000, room: "Terrasse" });
    expect(one("rambarde à barreaux 2,6 m").spec).toMatchObject({ category: "garde-corps", guard: "barreaudage", width: 2600 });
  });
  it("cloison, naco, vitrine et rideau métallique", () => {
    expect(one("cloison vitrée de bureau 3,4 m x 2,4 m").spec).toMatchObject({ category: "cloison", room: "Bureau", width: 3400, height: 2400 });
    expect(one("un naco pour la salle de bain 70x100 dépoli").spec).toMatchObject({ category: "fenetre", opening: "jalousie", glassType: "depoli", room: "Salle de bain" });
    expect(one("vitrine fixe 220 x 200").spec).toMatchObject({ opening: "fixe", width: 2200, height: 2000 });
    expect(one("rideau métallique 3m x 2,5m pour le garage").spec).toMatchObject({ category: "volet", shutter: "rideau", room: "Garage" });
  });
  it("options : double vitrage, moustiquaire, oscillo-battant, couleur bois", () => {
    expect(one("fenêtre oscillo-battante 100x130 double vitrage avec moustiquaire chêne doré").spec).toMatchObject({ opening: "oscillo", thickness: "4/12/4", extras: ["moustiquaire"], finish: "chene-dore" });
  });
  it("porte-fenêtre et porte pleine", () => {
    expect(one("une porte-fenêtre coulissante 2 m x 2,1 m sur la terrasse").spec).toMatchObject({ category: "porte", opening: "coulissant" });
    expect(one("porte pleine 90x210 en marron").spec).toMatchObject({ category: "porte", infill: "pleine", finish: "marron" });
  });
  it("liste à puces et retours à la ligne", () => {
    const r = analyze("Bonjour,\n- 2 fenêtres 120x100\n- 1 porte 90x210\n- 4 volets roulants 150x140 manuels");
    expect(r.items.map((i) => [i.spec.category, i.spec.qty])).toEqual([["fenetre", 2], ["porte", 1], ["volet", 4]]);
  });
  it("une cote n'est pas prise pour une quantité", () => {
    expect(one("fenêtre 120 x 100").spec.qty).toBe(1);
    expect(one("fenêtre coulissante 2 vantaux 150x120").spec).toMatchObject({ qty: 1, leaves: 2 });
  });
  it("pluriel sans nombre : quantité à confirmer", () => {
    expect(one("je veux changer mes fenêtres").assumptions).toContain("qty");
  });
  it("hors catalogue, lieu et urgence", () => {
    const r = analyze("Urgent : un portail et une fenêtre 120x100 à Ivandry");
    expect(r.unsupported).toEqual(["portail"]);
    expect(r.items).toHaveLength(1);
    expect(r.address).toBe("Ivandry");
    expect(r.urgent).toBe(true);
  });
  it("mots anglais et malgaches", () => {
    expect(one("2 windows 120x100 white").spec).toMatchObject({ category: "fenetre", qty: 2, finish: "blanc" });
    expect(one("varavarankely 1 150x120 mainty").spec).toMatchObject({ category: "fenetre", finish: "noir" });
  });
  it("frappe en cours : aucune cote absurde, aucune exception, quel que soit le préfixe du texte", () => {
    const t = "Bonjour, je voudrais 3 fenêtres coulissantes 150x120 en anthracite pour les chambres, une porte d'entrée 90x210 et un volet roulant 2,4 m x 2 m";
    for (let n = 1; n <= t.length; n++) {
      for (const it of analyze(t.slice(0, n)).items) {
        const l = toLine(it.spec); // ne lève jamais
        expect(l.width).toBeGreaterThanOrEqual(200);
        expect(l.height).toBeLessThanOrEqual(6000);
      }
    }
  });
  it("fautes de frappe : blan, europpern, coullisante, fenetre sans accent", () => {
    const i = one("creer moi une fenetre coulissante 1mx1m blan , norm europpern, taille vitre standard");
    expect(i.spec).toMatchObject({ category: "fenetre", opening: "coulissant", width: 1000, height: 1000, finish: "blanc", range: "europeen", qty: 1 });
    expect(i.assumptions).toEqual([]);
    expect(one("une fenetre coullisante 120x100 noire").spec).toMatchObject({ opening: "coulissant", finish: "noir" });
    expect(one("un naco pour la salle de bain 70x100").spec.category).toBe("fenetre"); // « bain » n'est pas « baie »
    expect(analyze("cloison vitrée 3,4 m x 2,4 m").items[0].spec.qty).toBe(1);
    expect(one("1 fenetre oscilo battante 100x130").spec.opening).toBe("oscillo");
  });
  it("deux couleurs pour deux fenêtres : une de chaque, même taille", () => {
    const r = analyze("je veux deux fenetre coulissante, marron et blanc de meme taille 1mx1m, une marron et une blanc");
    expect(r.items.map((i) => [i.spec.finish, i.spec.qty, i.spec.width, i.spec.height, i.spec.opening])).toEqual([["marron", 1, 1000, 1000, "coulissant"], ["blanc", 1, 1000, 1000, "coulissant"]]);
    expect(r.items.every((i) => i.assumptions.length === 0)).toBe(true);
  });
  it("répartition des couleurs : nombres explicites, ou répartition devinée et signalée", () => {
    expect(analyze("3 fenêtres 120x100, 2 blanches et 1 marron").items.map((i) => [i.spec.finish, i.spec.qty])).toEqual([["blanc", 2], ["marron", 1]]);
    expect(analyze("2 fenêtres 120x100 marron et blanche").items.map((i) => [i.spec.finish, i.spec.qty])).toEqual([["marron", 1], ["blanc", 1]]);
    const g = analyze("3 fenêtres 120x100 marron et blanche");
    expect(g.items.map((i) => i.spec.qty)).toEqual([2, 1]);
    expect(g.items[0].assumptions).toContain("finish"); // 2+1 deviné : à confirmer
    expect(analyze("une fenêtre 120x100 marron et blanche").items).toHaveLength(1);
  });
  it("texte sans ouvrage : rien d'inventé, une question", () => {
    const r = analyze("Bonjour, pouvez-vous m'appeler ?");
    expect(r.items).toEqual([]);
    expect(questions(r)).toEqual([{ key: "empty", item: -1 }]);
  });
  it("toLine produit un ouvrage valide et cohérent (une porte n'est jamais « naco »)", () => {
    const l = toLine({ category: "porte", opening: "jalousie", width: 900, height: 2100 });
    expect(l.opening).not.toBe("jalousie");
    expect(l.id).toMatch(/[0-9a-f-]{36}/);
  });
});
