import type { Messages } from "./messages/fr";
import { type AccessoryKey, type Line, FINISHES, PATTERN_GLASSES, type TariffKey, type TariffUnit, type Tariffs, OPENINGS_BY_CATEGORY, SLATS_ROULANT, SLATS_RIDEAU, SLAT_PITCH, hasLeafConfig, leafMotion, leavesSpec, splitOf } from "./model";

type Label = keyof Messages;

// Une coupe : quel profilé (section achetée en barres) sert à quel élément de l'ouvrage.
export type Piece = { profile: Label; element: Label; len: number; qty: number; line?: number; range?: Line["range"]; finish?: Line["finish"] };
export type Pane = { w: number; h: number; qty: number };
export type Dims = Pick<Line, "category" | "opening" | "leaves" | "shutter" | "guard" | "infill" | "width" | "height"> & Partial<Pick<Line, "box" | "slat">>;

// Naco : des lames de verre de 100 mm empilées entre deux montants ; leur nombre découle de la hauteur (40 mm de jeu en haut et en bas), jamais saisi.
export const NACO_BLADE = 100;
export const nacoBlades = (heightMm: number) => Math.max(1, Math.ceil((heightMm - 40) / NACO_BLADE));
export const KERF = 5;
export const REUSE_MIN = 500; // un reste de barre d'au moins 500 mm sert encore (traverse, barreau, petit ouvrant) : ce n'est pas une perte sèche

// Ramène une ligne à une combinaison valide (ex. une porte n'est jamais « naco », le nombre de vantaux reste dans sa plage).
export function normalize(l: Line): Line {
  const next = { ...l };
  const openings = OPENINGS_BY_CATEGORY[next.category];
  if (openings.length && !openings.includes(next.opening)) next.opening = openings[0];
  if (!openings.length) next.opening = "fixe";
  const spec = leavesSpec(next);
  if (spec) next.leaves = Math.min(spec.max, Math.max(spec.min, Math.round(next.leaves) || spec.min));
  else next.leaves = 1;
  if (next.category !== "porte") next.infill = "vitree";
  const glassy = next.category === "fenetre" || next.category === "porte" || next.category === "cloison" || (next.category === "garde-corps" && next.guard === "verre");
  if (!glassy || !PATTERN_GLASSES.includes(next.glassType)) next.pattern = "none";
  if (next.category !== "fenetre" && next.category !== "porte") next.extras = [];
  // « double sens » (B) n'a de sens que sur une porte battante
  // options de volet : valeurs valides pour le type de volet, sinon retirées
  if (next.category === "volet") {
    const slats: readonly string[] = next.shutter === "roulant" ? SLATS_ROULANT : SLATS_RIDEAU;
    next.slat = slats.includes(next.slat ?? "") ? next.slat : (slats[0] as Line["slat"]);
    if (next.shutter === "rideau" && next.box === "tunnel") next.box = "apparent"; // un rideau métallique n'a pas de coffre tunnel
  } else {
    delete next.box;
    delete next.slat;
    delete next.net;
  }
  if (next.leafCfg?.includes("B") && !(next.category === "porte" && next.opening === "ouvrant")) delete next.leafCfg;
  if (next.leafCfg && (next.leafCfg.length !== next.leaves || !hasLeafConfig(next))) delete next.leafCfg;
  return next;
}

const P = (profile: Label, element: Label, len: number, qty: number): Piece => ({ profile, element, len, qty });

// shortcut: formules de débit génériques (déductions fixes), à ajuster par série de profilés (voir docs/user-stories.md US-1.10).
export function cutList(l: Dims) {
  const { category, opening, leaves: n, width: L, height: H } = l;
  const pieces: Piece[] = [];
  const glass: Pane[] = [];
  const panels: Pane[] = [];
  const dormant = () => pieces.push(P("pf.dormant", "el.dormantH", L, 2), P("pf.dormant", "el.dormantV", H, 2));

  if (category === "volet") {
    if (l.shutter === "roulant") {
      const pitch = SLAT_PITCH[(SLATS_ROULANT as readonly string[]).includes(l.slat ?? "") ? (l.slat as keyof typeof SLAT_PITCH) : "39"];
      if (l.box !== "tunnel") pieces.push(P("pf.box", "el.box", L, 1)); // tunnel : pas de coffre, le volet s'enroule dans la maçonnerie
      pieces.push(P("pf.shaft", "el.shaft", L, 1), P("pf.guide", "el.guide", H, 2), P("pf.slat", "el.slat", L - 60, Math.ceil(H / pitch)));
    }
    else pieces.push(P("pf.shaft", "el.shaft", L, 1), P("pf.guide", "el.guide", H, 2), P("pf.slatR", "el.slatR", L - 40, Math.ceil(H / 70)));
    return { pieces, glass, panels };
  }

  if (category === "garde-corps") {
    const spans = Math.ceil(L / 1200); // un poteau au plus tous les 1,2 m
    pieces.push(P("pf.post", "el.post", H, spans + 1), P("pf.rail", "el.railTop", L, 1), P("pf.rail", "el.railBottom", L, 1));
    if (l.guard === "barreaudage") pieces.push(P("pf.bar", "el.bar", H - 120, Math.ceil(L / 120)));
    else glass.push({ w: Math.round(L / spans) - 90, h: H - 150, qty: spans });
    return { pieces, glass, panels };
  }

  if (category === "cloison") {
    dormant();
    if (n > 1) pieces.push(P("pf.mullion", "el.mullion", H - 60, n - 1));
    glass.push({ w: Math.round((L - 60 - (n - 1) * 50) / n), h: H - 60, qty: n });
    return { pieces, glass, panels };
  }

  dormant();
  if (opening === "fixe") {
    glass.push({ w: L - 60, h: H - 60, qty: 1 });
    return { pieces, glass, panels };
  }
  if (opening === "jalousie") {
    pieces.push(P("pf.louvre", "el.louvre", H - 40, 2));
    glass.push({ w: L - 40, h: NACO_BLADE, qty: nacoBlades(H) });
    return { pieces, glass, panels };
  }

  const slide = opening === "coulissant";
  // vantaux coulissants : recouvrement de 40 mm entre vantaux voisins ; ouvrants : jeu de 30 mm
  const lv = Math.round(slide ? (L + (n - 1) * 40) / n : (L - 30) / n);
  const hv = slide ? H - 50 : H - 30;
  const drop = slide ? 70 : 100; // déduction vitrage/panneau
  pieces.push(P("pf.sash", "el.sashH", lv, 2 * n), P("pf.sash", "el.sashV", hv, 2 * n));
  if (!slide && n >= 2) pieces.push(P("pf.battement", "el.battement", hv, Math.floor(n / 2)));

  const w = lv - drop;
  const h = hv - drop;
  if (category === "porte" && l.infill === "pleine") panels.push({ w, h, qty: n });
  else if (category === "porte" && l.infill === "semi") {
    const top = Math.round(h * splitOf(l));
    pieces.push(P("pf.mid", "el.mid", lv, n));
    glass.push({ w, h: top, qty: n });
    panels.push({ w, h: h - top, qty: n });
  } else if (category === "porte" && l.infill === "traverse") {
    // traverse intermédiaire : deux vitrages (62 % en haut), comme sur une porte vitrée à deux parties
    const top = Math.round((h - 40) * splitOf(l));
    pieces.push(P("pf.mid", "el.mid", lv, n));
    glass.push({ w, h: top, qty: n }, { w, h: h - 40 - top, qty: n });
  } else glass.push({ w, h, qty: n });
  return { pieces, glass, panels };
}

// Pièces d'un même élément et d'une même longueur, regroupées pour le plan de coupe (voir lib/procure.ts).
export type ElementUse = { element: Label; len: number; qty: number; lines: number[] };

// ---------- Prix ----------
export const tariffKey = (l: Pick<Line, "category" | "opening" | "shutter" | "guard">): TariffKey =>
  (l.category === "volet" ? `volet.${l.shutter}` : l.category === "garde-corps" ? `garde-corps.${l.guard}` : l.category === "cloison" ? "cloison.fixe" : `${l.category}.${l.opening}`) as TariffKey;

export const billedArea = (l: Pick<Line, "width" | "height">, minArea: number) => Math.max(minArea, (l.width * l.height) / 1e6);
// Quantité facturée selon l'unité du tarif : surface (au moins minArea) ou mètre linéaire (largeur de l'ouvrage).
export function billed(l: Line, s: { minArea: number; tariffUnits?: Partial<Record<string, TariffUnit>> }) {
  const ml = s.tariffUnits?.[tariffKey(l)] === "ml";
  return { qty: ml ? l.width / 1e3 : billedArea(l, s.minArea), unit: ml ? "ml" : "m²" };
}
// « Surface 1,2 m² » ou « Longueur 2 ml » (devis, PDF, carte d'ouvrage).
export function billedText(l: Line, s: { minArea: number; tariffUnits?: Partial<Record<string, TariffUnit>> }, t: (k: "pdf.area" | "pdf.length") => string) {
  const b = billed(l, s);
  return `${t(b.unit === "ml" ? "pdf.length" : "pdf.area")} ${fmt(Math.round(b.qty * 100) / 100)} ${b.unit}`;
}

// Clés de majoration qui s'appliquent à une ligne (une option sans objet ne coûte rien).
export function surchargeKeys(l: Line): string[] {
  const keys: string[] = [];
  if (l.range === "europeen") keys.push("range.europeen");
  const group = FINISHES.find((f) => f.id === l.finish)?.group;
  if (group === "anodise" || group === "fauxbois") keys.push(`finish.${group}`);
  if (l.category === "volet") {
    if (l.control === "motorise") keys.push("control.motorise");
    if (l.box === "encastre" || l.box === "tunnel") keys.push(`volet.box.${l.box}`);
    if (l.slat === "55" || l.slat === "perforee" || l.slat === "grille") keys.push(`volet.slat.${l.slat}`);
    if (l.net) keys.push("volet.net");
    return keys;
  }
  if (l.category === "fenetre" || l.category === "porte") keys.push(...l.extras.map((e) => `extra.${e}`));
  const hasGlass = l.category === "garde-corps" ? l.guard === "verre" : !(l.category === "porte" && l.infill === "pleine");
  if (hasGlass) {
    if (l.glassType !== "clair") keys.push(`glass.${l.glassType}`);
    if (l.thickness !== "4" && l.thickness !== "5") keys.push(`thickness.${l.thickness}`);
    if (l.pattern !== "none") keys.push("pattern.any");
  }
  return keys;
}

export function unitPrice(l: Line, tariffs: Tariffs, surcharges: Record<string, number>, minArea: number, tariffUnits?: Partial<Record<string, TariffUnit>>) {
  const pct = surchargeKeys(l).reduce((s, k) => s + (surcharges[k] ?? 0), 0);
  return Math.round(billed(l, { minArea, tariffUnits }).qty * tariffs[tariffKey(l)] * (1 + pct / 100));
}

export const lineTotal = (l: Pick<Line, "unit" | "qty">) => l.unit * l.qty;

export const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n).replace(/[  ]/g, " ");
// Longueurs de profilé : mètres avec 2 décimales (6000 -> « 6,00 m »).
export const meters = (mm: number) => `${(mm / 1000).toFixed(2).replace(".", ",")} m`;

// Toutes les coupes d'un devis, avec le numéro d'ouvrage et la quantité multipliée par celle de la ligne.
export const allPieces = (lines: Line[]): Piece[] =>
  lines.flatMap((l, i) => cutList(l).pieces.map((p) => ({ ...p, qty: p.qty * l.qty, line: i + 1, range: l.range, finish: l.finish })));

// Accessoires nécessaires à UN ouvrage (la quantité du devis est appliquée par l'appelant) : poignées, serrures, charnières, galets, joints, moteur…
// shortcut: règles génériques (nombre de charnières, longueur de joint), à ajuster avec les gens du métier.
export function accessoriesFor(l: Pick<Line, "category" | "opening" | "leaves" | "direction" | "leafCfg" | "control" | "guard" | "extras" | "width" | "height"> & Partial<Pick<Line, "net">>): { key: AccessoryKey; qty: number }[] {
  const out: Partial<Record<AccessoryKey, number>> = {};
  const add = (k: AccessoryKey, n: number) => n > 0 && (out[k] = (out[k] ?? 0) + n);
  const W = l.width / 1000;
  const H = l.height / 1000;
  const perimeter = 2 * (W + H);
  if (l.category === "volet") {
    add(l.control === "motorise" ? "acc.motor" : "acc.crank", 1);
    if (l.net) add("acc.net", 1);
    return Object.entries(out).map(([key, qty]) => ({ key: key as AccessoryKey, qty: qty! }));
  }
  if (l.category === "garde-corps") {
    add("acc.plate", 2 * (Math.ceil(l.width / 1200) + 1));
    if (l.guard === "verre") add("acc.silicone", 1);
  } else if (l.category === "cloison") {
    add("acc.silicone", Math.max(1, Math.ceil(perimeter / 8)));
  } else {
    const door = l.category === "porte";
    const mob = l.opening === "jalousie" ? 1 : leafMotion(l).filter((m) => !m.fixed).length;
    const lv = W / Math.max(l.leaves, 1);
    if (l.opening === "coulissant") {
      add("acc.roller", 2 * mob);
      add("acc.sliderLock", mob);
      if (door) add("acc.doorHandle", mob);
      add("acc.seal", perimeter + 2 * H * mob);
    } else if (l.opening === "ouvrant" || l.opening === "oscillo" || l.opening === "soufflet") {
      add(door ? "acc.doorHandle" : "acc.handle", mob);
      add("acc.hinge", mob * (door ? (l.height > 2200 ? 4 : 3) : l.height > 1500 ? 3 : 2));
      if (door) {
        add("acc.lock", mob);
        add("acc.knob", mob);
      }
      add("acc.seal", mob * 2 * (lv + H));
    } else if (l.opening === "jalousie") add("acc.crank", 1);
    if (l.extras.includes("moustiquaire")) add("acc.net", Math.max(1, mob));
    add("acc.silicone", Math.max(1, Math.ceil(perimeter / 8)));
  }
  return Object.entries(out).map(([key, qty]) => ({ key: key as AccessoryKey, qty: Math.round(qty! * 10) / 10 }));
}

// Surface de verre d'un ouvrage en m² (× quantité du devis non appliquée), avec le coefficient de prix : double vitrage ×2, 8 mm et plus ×1,5.
export function glassOf(l: Line): { id: string; area: number; weighted: number } {
  const area = cutList(l).glass.reduce((s, g) => s + (g.w * g.h * g.qty) / 1e6, 0);
  const k = l.thickness.includes("/") ? 2 : Number(l.thickness) >= 8 ? 1.5 : 1;
  return { id: l.glassType, area, weighted: area * k };
}
