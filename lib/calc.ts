import type { Messages } from "./messages/fr";
import { type Line, FINISHES, PATTERN_GLASSES, type TariffKey, type Tariffs, OPENINGS_BY_CATEGORY, hasLeafConfig, leavesSpec } from "./model";

type Label = keyof Messages;

// Une coupe : quel profilé (section achetée en barres) sert à quel élément de l'ouvrage.
export type Piece = { profile: Label; element: Label; len: number; qty: number; line?: number; range?: Line["range"]; finish?: Line["finish"] };
export type Pane = { w: number; h: number; qty: number };
export type Dims = Pick<Line, "category" | "opening" | "leaves" | "shutter" | "guard" | "infill" | "width" | "height">;

export const BAR_LEN = 6000;
export const KERF = 5;

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
    if (l.shutter === "roulant") pieces.push(P("pf.box", "el.box", L, 1), P("pf.guide", "el.guide", H, 2), P("pf.slat", "el.slat", L - 60, Math.ceil(H / 37)));
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
    glass.push({ w: L - 40, h: 100, qty: Math.ceil((H - 40) / 100) });
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
    const top = Math.round(h * 0.6);
    pieces.push(P("pf.mid", "el.mid", lv, n));
    glass.push({ w, h: top, qty: n });
    panels.push({ w, h: h - top, qty: n });
  } else glass.push({ w, h, qty: n });
  return { pieces, glass, panels };
}

// ---------- Plan de coupe ----------
export type ElementUse = { element: Label; len: number; qty: number; lines: number[] };
export type Bar = { cuts: number[]; left: number };
export type ProfilePlan = {
  profile: Label;
  elements: ElementUse[];
  bars: Bar[];
  barLen: number;
  usedLen: number; // somme des pièces coupées
  totalLen: number; // barres achetées × longueur
  wasteLen: number; // chutes + traits de scie
  wastePct: number;
  tooLong: number[]; // pièces plus longues qu'une barre : impossibles à couper
};

// First-fit decreasing, une barre par profilé : où chaque pièce est coupée, ce qui reste, ce qui se perd.
export function cuttingPlan(pieces: Piece[], barLen = BAR_LEN, kerf = KERF): ProfilePlan[] {
  const byProfile = new Map<Label, Piece[]>();
  for (const p of pieces) byProfile.set(p.profile, [...(byProfile.get(p.profile) ?? []), p]);

  return [...byProfile].map(([profile, list]) => {
    const uses = new Map<string, ElementUse>();
    for (const p of list) {
      const k = `${p.element}|${p.len}`;
      const u = uses.get(k) ?? { element: p.element, len: p.len, qty: 0, lines: [] };
      u.qty += p.qty;
      if (p.line !== undefined && !u.lines.includes(p.line)) u.lines.push(p.line);
      uses.set(k, u);
    }
    const lens = list.flatMap((p) => Array<number>(p.qty).fill(p.len)).sort((a, b) => b - a);
    const bars: Bar[] = [];
    const tooLong: number[] = [];
    let usedLen = 0;
    for (const len of lens) {
      if (len + kerf > barLen) {
        tooLong.push(len);
        continue;
      }
      usedLen += len;
      const bar = bars.find((b) => b.left >= len + kerf);
      if (bar) {
        bar.cuts.push(len);
        bar.left -= len + kerf;
      } else bars.push({ cuts: [len], left: barLen - len - kerf });
    }
    const totalLen = bars.length * barLen;
    const wasteLen = totalLen - usedLen;
    return {
      profile,
      elements: [...uses.values()],
      bars,
      barLen,
      usedLen,
      totalLen,
      wasteLen,
      wastePct: totalLen ? Math.round((wasteLen / totalLen) * 100) : 0,
      tooLong,
    };
  });
}

export function planTotals(plans: ProfilePlan[]) {
  const bars = plans.reduce((s, p) => s + p.bars.length, 0);
  const totalLen = plans.reduce((s, p) => s + p.totalLen, 0);
  const usedLen = plans.reduce((s, p) => s + p.usedLen, 0);
  const wasteLen = totalLen - usedLen;
  return { bars, totalLen, usedLen, wasteLen, wastePct: totalLen ? Math.round((wasteLen / totalLen) * 100) : 0 };
}

// ---------- Prix ----------
export const tariffKey = (l: Pick<Line, "category" | "opening" | "shutter" | "guard">): TariffKey =>
  (l.category === "volet" ? `volet.${l.shutter}` : l.category === "garde-corps" ? `garde-corps.${l.guard}` : l.category === "cloison" ? "cloison.fixe" : `${l.category}.${l.opening}`) as TariffKey;

export const billedArea = (l: Pick<Line, "width" | "height">, minArea: number) => Math.max(minArea, (l.width * l.height) / 1e6);

// Clés de majoration qui s'appliquent à une ligne (une option sans objet ne coûte rien).
export function surchargeKeys(l: Line): string[] {
  const keys: string[] = [];
  if (l.range === "europeen") keys.push("range.europeen");
  const group = FINISHES.find((f) => f.id === l.finish)?.group;
  if (group === "anodise" || group === "fauxbois") keys.push(`finish.${group}`);
  if (l.category === "volet") {
    if (l.control === "motorise") keys.push("control.motorise");
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

export function unitPrice(l: Line, tariffs: Tariffs, surcharges: Record<string, number>, minArea: number) {
  const pct = surchargeKeys(l).reduce((s, k) => s + (surcharges[k] ?? 0), 0);
  return Math.round(billedArea(l, minArea) * tariffs[tariffKey(l)] * (1 + pct / 100));
}

export const lineTotal = (l: Pick<Line, "unit" | "qty">) => l.unit * l.qty;

export const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n).replace(/[  ]/g, " ");
// Longueurs de profilé : mètres avec 2 décimales (6000 -> « 6,00 m »).
export const meters = (mm: number) => `${(mm / 1000).toFixed(2).replace(".", ",")} m`;

// Toutes les coupes d'un devis, avec le numéro d'ouvrage et la quantité multipliée par celle de la ligne.
export const allPieces = (lines: Line[]): Piece[] =>
  lines.flatMap((l, i) => cutList(l).pieces.map((p) => ({ ...p, qty: p.qty * l.qty, line: i + 1, range: l.range, finish: l.finish })));
