import { normalize } from "./calc";
import { type Category, type FinishId, type Line, type Opening, lineSchema } from "./model";

// Assistant de demande de devis : comprend une description libre (« 3 fenêtres coulissantes 150x120 anthracite pour les chambres, un volet roulant motorisé… »)
// et la transforme en ouvrages structurés, avec ce qui a été déduit par défaut et ce qui manque.
// Pur, déterministe et sans dépendance (français d'abord, quelques mots anglais et malgaches) : fonctionne hors ligne, côté client comme côté serveur.
// shortcut: analyse par règles et mots-clés, pas de compréhension générale du langage ; une phrase très atypique donne moins d'ouvrages ou une confiance faible, jamais un chiffrage silencieux.

export type Spec = Partial<Omit<Line, "id" | "unit">> & { category: Category };
export type AssumptionKey = "size" | "opening" | "leaves" | "finish" | "guard" | "qty" | "control";
export type IntakeItem = {
  spec: Spec;
  text: string; // morceau de phrase d'où l'ouvrage est tiré
  assumptions: AssumptionKey[]; // valeurs posées par défaut : à confirmer
  confidence: number; // 0 à 1
};
export type IntakeResult = {
  items: IntakeItem[];
  unsupported: string[]; // éléments reconnus mais hors catalogue (portail, véranda…)
  address: string; // lieu repéré (« à Ivandry »), vide sinon
  urgent: boolean;
};

// ---------- normalisation ----------
const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const WORDS: Record<string, number> = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, quinze: 15, vingt: 20, one: 1, two: 2, three: 3, four: 4, five: 5, iray: 1, roa: 2, telo: 3, efatra: 4, dimy: 5 };
const NUM = "(?:\\d+|" + Object.keys(WORDS).join("|") + ")";
const toNum = (s: string) => (/^\d+$/.test(s) ? Number(s) : WORDS[s] ?? NaN);
const dec = (s: string) => Number(s.replace(",", "."));

// Longueur en mm : l'unité écrite fait foi ; sans unité, < 10 → mètres (1,5), ≤ 400 → centimètres (120), sinon millimètres (1500).
const mm = (v: number, unit?: string) => Math.round(unit === "m" ? v * 1000 : unit === "cm" ? v * 10 : unit === "mm" ? v : v < 10 ? v * 1000 : v <= 400 ? v * 10 : v);

// ---------- ouvrages reconnus ----------
type Head = { re: RegExp; make: (m: RegExpExecArray) => Spec | "skip" };
const HEADS: Head[] = [
  { re: /\b(?:portails?|grilles? de cloture|veranda|escalier|rampe|pergola|auvent|store)s?\b/g, make: () => "skip" },
  { re: /\bporte[- ]?fenetres?\b|\bbaies? (?:vitrees? )?(?:coulissantes? )?(?:porte|sur (?:la )?terrasse)\b/g, make: () => ({ category: "porte", opening: "coulissant" }) },
  { re: /\brideaux? (?:metalliques?|de fer|de garage)\b|\bvolets? metalliques?\b/g, make: () => ({ category: "volet", shutter: "rideau" }) },
  { re: /\bvolets?(?: roulants?)?\b|\broller shutters?\b|\bshutters?\b/g, make: () => ({ category: "volet", shutter: "roulant" }) },
  { re: /\bgarde[- ]?corps\b|\brambardes?\b|\bbalustrades?\b|\bmains? courantes?\b|\brailings?\b/g, make: () => ({ category: "garde-corps" }) },
  { re: /\bcloisons?\b|\bpartitions?\b/g, make: () => ({ category: "cloison" }) },
  { re: /\bnacos?\b|\bjalousies?\b/g, make: () => ({ category: "fenetre", opening: "jalousie", leaves: 1 }) },
  { re: /\bvitrines?\b/g, make: () => ({ category: "fenetre", opening: "fixe", leaves: 1 }) },
  { re: /\bbaies?(?: vitrees?)?\b/g, make: () => ({ category: "fenetre", opening: "coulissant" }) },
  { re: /\bfenetres?\b|\bchassis\b|\bwindows?\b|\bvaravarankely\b/g, make: () => ({ category: "fenetre" }) },
  { re: /\bportes?\b|\bdoors?\b|\bvaravarana\b/g, make: () => ({ category: "porte" }) },
];

const FINISH_WORDS: [RegExp, FinishId][] = [
  [/chene dore|faux bois|imitation bois|effet bois|\bbois\b/, "chene-dore"],
  [/chene clair/, "chene-clair"],
  [/noyer/, "noyer"],
  [/acajou/, "acajou"],
  [/champagne|\bdore\b|\bor\b/, "champagne"],
  [/anthracite|gris fonce|\bgris\b|\bgray\b|\bgrey\b/, "anthracite"],
  [/\bnoir(?:e|s|es)?\b|\bblack\b|\bmainty\b/, "noir"],
  [/\bblanc(?:he|s|hes)?\b|\bwhite\b|\bfotsy\b/, "blanc"],
  [/bronze/, "bronze"],
  [/marron|\bbrun\b|\bbrown\b/, "marron"],
  [/naturel|argent|\binox\b|anodise|alu brut/, "naturel"],
];
const ROOMS: [RegExp, string][] = [
  [/salle de bains?|\bsdb\b|\bsalle d'eau\b/, "Salle de bain"], [/\bwc\b|toilettes?/, "WC"], [/salon|sejour|salle a manger/, "Salon"], [/chambres? ?(\d)?/, "Chambre"],
  [/cuisine/, "Cuisine"], [/bureau/, "Bureau"], [/terrasse/, "Terrasse"], [/balcon/, "Balcon"], [/garage/, "Garage"], [/entree/, "Entrée"],
  [/escalier/, "Escalier"], [/couloir/, "Couloir"], [/boutique|magasin|commerce/, "Boutique"], [/facade/, "Façade"],
];

// ---------- dimensions ----------
type Size = { w?: number; h?: number };
function sizeOf(c: string, category: Category): Size {
  const r = sizeRaw(c, category);
  // une cote hors de ce que l'application sait fabriquer (frappe en cours, faute de frappe) est ignorée plutôt que reprise telle quelle
  const ok = (n?: number) => (n !== undefined && n >= 200 && n <= 6000 ? n : undefined);
  return { w: ok(r.w), h: ok(r.h) };
}
function sizeRaw(c: string, category: Category): Size {
  const out: Size = {};
  // largeur / hauteur nommées
  const lab = (names: string) => new RegExp(`\\b(?:${names})\\s*(?:de|d'|:|=)?\\s*(\\d+(?:[.,]\\d+)?)\\s*(mm|cm|m)?\\b`);
  const w1 = lab("largeur|larg|l").exec(c) ?? /(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?\s*de\s*(?:large|largeur)\b/.exec(c);
  const h1 = lab("hauteur|haut|h").exec(c) ?? /(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?\s*de\s*(?:haut|hauteur)\b/.exec(c);
  if (w1) out.w = mm(dec(w1[1]), w1[2]);
  if (h1) out.h = mm(dec(h1[1]), h1[2]);
  if (out.w && out.h) return out;
  // « 150 x 120 », « 1,5 m par 1,2 m », « 2m x 1m20 »
  const num = "(\\d+\\s*m\\s*\\d{1,2}\\b|\\d+(?:[.,]\\d+)?)";
  const pair = new RegExp(`${num}\\s*(mm|cm|m)?\\s*(?:x|×|\\*|par|sur)\\s*${num}\\s*(mm|cm|m)?`).exec(c);
  if (pair) {
    // « 1m20 » = 1,20 m
    const val = (s: string, u?: string) => {
      const m = /^(\d+)\s*m\s*(\d{1,2})$/.exec(s);
      return m ? Math.round((Number(m[1]) + Number(m[2].padEnd(2, "0")) / 100) * 1000) : mm(dec(s), u);
    };
    const unit = pair[2] ?? pair[4];
    const a = val(pair[1], pair[2] ?? unit);
    const b = val(pair[3], pair[4] ?? unit);
    // une porte est plus haute que large, quelle que soit l'écriture ; sinon l'ordre écrit largeur × hauteur est respecté
    const [w, h] = category === "porte" ? [Math.min(a, b), Math.max(a, b)] : [a, b];
    out.w ??= w;
    out.h ??= h;
    return out;
  }
  // une seule cote : « de 3 mètres », « 2,5 m de long »
  const one = /(\d+(?:[.,]\d+)?)\s*(?:metres?|m|cm|mm)\b(?:\s*de\s*(?:long|longueur))?/.exec(c);
  if (one && !out.w && !out.h) {
    const u = /metres?/.test(one[0]) ? "m" : /cm/.test(one[0]) ? "cm" : /mm/.test(one[0]) ? "mm" : "m";
    if (category === "garde-corps" || category === "cloison" || /long/.test(one[0])) out.w = mm(dec(one[1]), u);
    else out.w = mm(dec(one[1]), u);
  }
  return out;
}
const DEFAULT_SIZE: Record<Category, Required<Size>> = { fenetre: { w: 1200, h: 1200 }, porte: { w: 900, h: 2100 }, volet: { w: 1200, h: 1400 }, "garde-corps": { w: 3000, h: 1000 }, cloison: { w: 3000, h: 2400 } };

// Fiabilité d'un ouvrage : des dimensions inventées pèsent lourd, les autres suppositions un peu.
const confidence = (a: AssumptionKey[]) => Math.max(0.15, Math.round((1 - (a.includes("size") ? 0.4 : 0) - 0.1 * new Set(a.filter((k) => k !== "size")).size) * 100) / 100);

// ---------- analyse d'un morceau de phrase ----------
function fill(head: Spec, raw: string, c: string): IntakeItem {
  const spec: Spec = { ...head };
  const assumptions: AssumptionKey[] = [];
  const cat = spec.category;

  // quantité écrite après l'ouvrage : « x3 », « 3 pièces » (celle qui le précède est lue dans analyze)
  const qty = /(?<![\d.,]\s*)(?:x|×)\s*(\d+)\b(?!\s*(?:mm|cm|m\b))|\b(\d+)\s*(?:pieces?|unites?|exemplaires?)\b/.exec(c);
  if (qty) spec.qty = Number(qty[1] ?? qty[2]);

  // ouverture
  if (cat === "fenetre" || cat === "porte") {
    if (/coulissan|coulisse|\bsliding\b|miseki/.test(c)) spec.opening = "coulissant";
    else if (/oscillo/.test(c)) spec.opening = "oscillo";
    else if (/soufflet/.test(c)) spec.opening = "soufflet";
    else if (/\bfixes?\b/.test(c)) spec.opening = "fixe";
    else if (/ouvrant|battant|a la francaise|ouvre|\bhinged\b/.test(c)) spec.opening = "ouvrant";
    if (!spec.opening) {
      spec.opening = cat === "porte" ? "ouvrant" : "coulissant"; // les plus courantes : porte battante, fenêtre coulissante
      assumptions.push("opening");
    }
    if (spec.opening === "jalousie") spec.leaves = 1;
  }

  // vantaux
  const lv = new RegExp(`(${NUM})\\s*(?:vantaux|vantail|battants?|panneaux|portes?|volets)\\b`).exec(c);
  if (lv && toNum(lv[1]) >= 1 && cat !== "volet" && cat !== "garde-corps") spec.leaves = toNum(lv[1]);
  else if (/double porte|double battant|deux battants/.test(c)) spec.leaves = 2;
  else if (/\bsimple\b|1 vantail/.test(c) && cat !== "cloison") spec.leaves = 1;

  // taille
  const size = sizeOf(c, cat);
  const d = DEFAULT_SIZE[cat];
  if (!size.w || !size.h) assumptions.push("size");
  spec.width = size.w ?? d.w;
  spec.height = size.h ?? d.h;
  if (size.w && !size.h && (cat === "porte" || cat === "volet")) spec.height = d.h;
  if (cat === "garde-corps" && size.w && size.w < 700 && size.h === undefined) spec.width = d.w; // « 1 m de haut » pris pour la longueur : on garde la valeur par défaut

  // nombre de vantaux par défaut selon la largeur
  if ((cat === "fenetre" || cat === "porte") && spec.leaves === undefined && spec.opening !== "fixe" && spec.opening !== "jalousie") {
    const w = spec.width;
    spec.leaves = spec.opening === "coulissant" ? (w > 3000 ? 4 : w > 2000 ? 3 : 2) : w > 1000 ? 2 : 1;
    if (!size.w) assumptions.push("leaves");
  }
  if (cat === "cloison" && spec.leaves === undefined) spec.leaves = Math.max(1, Math.round(spec.width / 800));

  // couleur
  const finish = FINISH_WORDS.find(([re]) => re.test(c));
  if (finish) {
    spec.finish = finish[1];
    if (/\bgris\b/.test(c) && !/anthracite|fonce/.test(c)) assumptions.push("finish"); // « gris » → gris anthracite, à confirmer
    if (/\bbois\b/.test(c) && !/chene|noyer|acajou/.test(c)) assumptions.push("finish");
  }

  // verre
  if (/double vitrage|4\/12\/4|6\/12\/6/.test(c)) spec.thickness = /6\/12\/6/.test(c) ? "6/12/6" : "4/12/4";
  const th = /(?:verre|vitrage|epaisseur)\D{0,14}\b(4|5|6|8|10)\s*mm/.exec(c);
  if (th && !spec.thickness) spec.thickness = th[1] as Line["thickness"];
  if (/feuillete|securit|securite/.test(c)) spec.glassType = "feuillete";
  else if (/trempe/.test(c)) spec.glassType = "trempe";
  else if (/depoli|sable|opaque|intimite|vitre?\s*cache/.test(c)) spec.glassType = "depoli";
  else if (/reflechissant|miroir/.test(c)) spec.glassType = "reflechissant";
  else if (/teinte|fume/.test(c)) spec.glassType = /bronze/.test(c) ? "teinte-bronze" : /vert/.test(c) ? "teinte-vert" : "teinte-gris";
  if (cat === "porte") {
    if (/pleine|opaque|sans vitrage|bois plein|tole/.test(c)) spec.infill = "pleine";
    else if (/semi[- ]?vitree|moitie vitree|partie vitree|demi[- ]?vitree/.test(c)) spec.infill = "semi";
  }

  // options
  if (cat === "fenetre" || cat === "porte") {
    const extras: Line["extras"] = [];
    if (/moustiquaire|anti[- ]?moustique/.test(c)) extras.push("moustiquaire");
    if (/grille de (?:defense|protection)|barreaux de protection|grillage/.test(c)) extras.push("grille");
    if (extras.length) spec.extras = extras;
  }
  if (cat === "volet") {
    if (/motoris|electrique|telecommande|moteur|automatique/.test(c)) spec.control = "motorise";
    else if (/manivelle|manuel|sangle|a la main/.test(c)) spec.control = "manuel";
    else assumptions.push("control");
    if (spec.shutter === "roulant") {
      if (/tunnel/.test(c)) spec.box = "tunnel";
      else if (/encastre/.test(c)) spec.box = "encastre";
      else if (/apparent|exterieur/.test(c)) spec.box = "apparent";
      if (/moustiquaire/.test(c)) spec.net = true;
    }
  }
  if (cat === "garde-corps") {
    if (/verre|vitre|transparent|cristal/.test(c)) spec.guard = "verre";
    else if (/barreau|barreaudage|fer|grille|aluminium|alu\b|inox/.test(c)) spec.guard = "barreaudage";
    else {
      spec.guard = "verre";
      assumptions.push("guard");
    }
  }

  // pièce
  for (const [re, label] of ROOMS) {
    const m = re.exec(c);
    if (m) {
      spec.room = m[1] ? `${label} ${m[1]}` : label;
      break;
    }
  }

  if (!spec.qty) {
    // pluriel sans nombre (« des fenêtres ») : on retient 1 et on le signale
    spec.qty = 1;
    if (/\b(?:des|les|mes|plusieurs|toutes?)\b/.test(c) && /(?:fenetres|portes|volets|baies|cloisons|nacos|garde-corps)\b/.test(c)) assumptions.push("qty");
  }
  return { spec, text: raw.trim(), assumptions: [...new Set(assumptions)], confidence: confidence(assumptions) };
}

// ---------- découpage en ouvrages ----------
export function analyze(input: string): IntakeResult {
  const raw = input.replace(/\r/g, "").slice(0, 6000);
  const text = strip(raw).replace(/[’‘]/g, "'");
  // positions de chaque ouvrage cité ; une même portion de texte ne compte qu'une fois (« porte-fenêtre » avant « porte »)
  const found: { at: number; end: number; head: Spec | "skip"; word: string }[] = [];
  const taken: [number, number][] = [];
  for (const h of HEADS) {
    h.re.lastIndex = 0;
    for (let m = h.re.exec(text); m; m = h.re.exec(text)) {
      const at = m.index;
      const end = at + m[0].length;
      if (taken.some(([a, b]) => at < b && end > a)) continue;
      taken.push([at, end]);
      found.push({ at, end, head: h.make(m), word: m[0] });
    }
  }
  found.sort((a, b) => a.at - b.at);

  const items: IntakeItem[] = [];
  const unsupported: string[] = [];
  const sep = /[\n;,.]|\bet\b|\bpuis\b|\bainsi que\b|\bplus\b|\bavec\b|(?:^|\s)[-•*]\s/g;
  // limite entre deux ouvrages : dernier séparateur, sinon juste avant le nombre qui précède le second ouvrage
  const cut = (prevEnd: number, at: number) => {
    const slice = text.slice(prevEnd, at);
    let last = -1;
    sep.lastIndex = 0;
    for (let m = sep.exec(slice); m; m = sep.exec(slice)) last = m.index + m[0].length;
    if (last >= 0) {
      // « avec » introduit un attribut de l'ouvrage précédent s'il n'y a pas de nombre devant le suivant
      return prevEnd + last;
    }
    const n = new RegExp(`(?:${NUM})\\s*(?:grand(?:e)?s?|petit(?:e)?s?|belles?|nouvelles?)?\\s*$`).exec(slice);
    return n ? prevEnd + n.index : at;
  };
  const bounds = found.map((f, i) => ({ start: i === 0 ? Math.max(0, f.at - 40) : cut(found[i - 1].end, f.at), end: 0 }));
  bounds.forEach((b, i) => (b.end = i + 1 < bounds.length ? bounds[i + 1].start : text.length));
  // le début d'une clause ne remonte pas au-delà du séparateur précédent
  if (found[0]) bounds[0].start = Math.max(bounds[0].start, text.slice(0, found[0].at).search(/[^\n;.,]*$/));

  found.forEach((f, i) => {
    const { start, end } = bounds[i];
    const clause = text.slice(start, end);
    const rawClause = raw.slice(start, end);
    if (f.head === "skip") {
      unsupported.push(f.word.trim());
      return;
    }
    // quantité écrite juste avant l'ouvrage (dans sa clause) : « deux grandes fenêtres »
    const before = text.slice(start, f.at);
    const qm = new RegExp(`(${NUM})\\s*(?:grand(?:e)?s?|petit(?:e)?s?|belles?|nouvelles?|nouveaux?|simples?|doubles?)?\\s*$`).exec(before);
    const item = fill(f.head, rawClause, clause);
    if (qm && !(item.spec.qty && item.spec.qty > 1)) {
      const n = toNum(qm[1]);
      // « 3 vantaux » ou une cote (120 x 100) ne sont pas une quantité
      const afterNum = clause.slice(clause.indexOf(qm[0]) + qm[1].length);
      if (n >= 1 && n <= 99 && !/^\s*(?:vantaux|vantail|battants?|mm|cm|m\b|x|×)/.test(afterNum)) {
        item.spec.qty = n;
        item.assumptions = item.assumptions.filter((k) => k !== "qty"); // le nombre est écrit : plus de doute
        item.confidence = confidence(item.assumptions);
      }
    }
    // ouvrage décrit avec « chacune / chacun » ou « x N » : déjà géré dans fill()
    items.push(item);
  });

  const addr = /(?<![\p{L}])(?:à|au|aux|dans le quartier de|quartier)\s+((?:[A-Z][\p{L}'-]+)(?:\s+[A-Z][\p{L}'-]+){0,2})/u.exec(raw.replace(/\n/g, " "));
  return { items, unsupported: [...new Set(unsupported)], address: addr?.[1] ?? "", urgent: /urgent|au plus vite|rapidement|des que possible|asap|vite/.test(text) };
}

// Questions à poser au client pour lever les doutes (clés, traduites par l'interface).
export type Question = { key: AssumptionKey | "empty"; item: number };
export function questions(r: IntakeResult): Question[] {
  if (!r.items.length) return [{ key: "empty", item: -1 }];
  return r.items.flatMap((it, i) => (["size", "qty", "opening"] as AssumptionKey[]).filter((k) => it.assumptions.includes(k)).map((key) => ({ key, item: i })));
}

// Ouvrage complet (valeurs par défaut du schéma, combinaison valide) à partir d'une spécification ; `unit` est fixé par l'appelant (prix du menuisier) ou laissé à 0.
export function toLine(spec: Spec, unit = 0): Line {
  const base = { id: crypto.randomUUID(), shutter: "roulant", control: "manuel", guard: "verre", range: "asiatique", finish: "blanc", infill: "vitree", glassType: "clair", thickness: "5", pattern: "none", extras: [], opening: "coulissant" as Opening, leaves: 2, width: 1200, height: 1200, qty: 1, unit };
  const clamp = (n: number | undefined, d: number) => Math.min(6000, Math.max(200, n ?? d));
  return normalize(lineSchema.parse({ ...base, ...spec, width: clamp(spec.width, 1200), height: clamp(spec.height, 1200), unit }));
}
