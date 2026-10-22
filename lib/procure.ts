import { type ElementUse, type Piece, KERF, allPieces } from "./calc";
import { type FinishId, type Line, type Market, type Offer, finishMarkup, finishOn, profileOn, rangeOn } from "./model";
import type { Messages } from "./messages/fr";

type Label = keyof Messages;

// Une barre achetée : quelle offre du marché, quelles coupes, ce qui reste.
export type BuyBar = { length: number; price: number; cuts: number[]; left: number };
export type Purchase = { length: number; price: number; count: number };
export type GroupPlan = {
  key: string; // profilé + gamme + couleur : des barres de couleurs ou de gammes différentes ne se mélangent pas
  profile: Label;
  range: string;
  finish: string;
  elements: ElementUse[];
  lines: number[]; // ouvrages qui utilisent ce même profilé
  bars: BuyBar[];
  purchase: Purchase[];
  usedLen: number;
  totalLen: number;
  wasteLen: number;
  wastePct: number;
  cost: number;
  tooLong: number[]; // pièces plus longues que toutes les barres du marché
  noOffer: boolean;
  unavailable: boolean; // gamme ou couleur que les fournisseurs n'ont pas : le prix est indicatif
  share: Record<number, { usedLen: number; cost: number }>; // part de chaque ouvrage (longueur coupée, coût avec sa part de chute)
};

// Prix d'une offre pour une gamme et une couleur données (majorations du marché appliquées).
export function priced(offers: Offer[], market: Market, range: string, finish: string): Offer[] {
  const pct = (range === "europeen" ? market.rangeMarkup : 0) + finishMarkup(market, finish as FinishId);
  return offers.filter((o) => o.length > 0 && !o.off).map((o) => ({ length: o.length, price: Math.round(o.price * (1 + pct / 100)) }));
}

// Remplit des barres de longueur `len` (first-fit decreasing), puis ramène chaque barre à l'offre la moins chère qui contient ses coupes.
function fill(lens: number[], len: number, offers: Offer[], kerf: number): BuyBar[] {
  const bars: { cuts: number[]; left: number }[] = [];
  for (const c of lens) {
    const bar = bars.find((b) => b.left >= c + kerf);
    if (bar) {
      bar.cuts.push(c);
      bar.left -= c + kerf;
    } else bars.push({ cuts: [c], left: len - c - kerf });
  }
  return bars.map((b) => {
    const need = b.cuts.reduce((s, c) => s + c + kerf, 0);
    const best = offers.filter((o) => o.length >= need).sort((a, c) => a.price - c.price || a.length - c.length)[0];
    return { length: best.length, price: best.price, cuts: b.cuts, left: best.length - need };
  });
}

// shortcut: heuristique (pas l'optimum garanti : le problème est NP-difficile) ; essaie chaque longueur du marché comme base,
// ajuste chaque barre à l'offre la moins chère qui convient, et garde le plan le moins cher (puis le moins de chute).
export function planGroup(lens: number[], offers: Offer[], kerf: number) {
  const sorted = [...lens].sort((a, b) => b - a);
  const maxLen = Math.max(0, ...offers.map((o) => o.length));
  const tooLong = sorted.filter((c) => c + kerf > maxLen);
  const usable = sorted.filter((c) => c + kerf <= maxLen);
  let best: BuyBar[] = [];
  let bestCost = Infinity;
  let bestWaste = Infinity;
  if (usable.length) {
    for (const base of offers) {
      if (usable[0] + kerf > base.length) continue;
      const bars = fill(usable, base.length, offers, kerf);
      const cost = bars.reduce((s, b) => s + b.price, 0);
      const waste = bars.reduce((s, b) => s + b.length, 0);
      if (cost < bestCost || (cost === bestCost && waste < bestWaste)) [best, bestCost, bestWaste] = [bars, cost, waste];
    }
  }
  return { bars: best, tooLong };
}

export type Procurement = {
  groups: GroupPlan[];
  totalCost: number;
  bars: number;
  totalLen: number;
  usedLen: number;
  wasteLen: number;
  wastePct: number;
  byLine: Record<number, { cost: number; usedLen: number }>;
};

export function procure(pieces: Piece[], market: Market, kerf = KERF): Procurement {
  const byKey = new Map<string, Piece[]>();
  for (const p of pieces) {
    const key = `${p.profile}|${p.range ?? "asiatique"}|${p.finish ?? "blanc"}`;
    byKey.set(key, [...(byKey.get(key) ?? []), p]);
  }

  const groups: GroupPlan[] = [...byKey].map(([key, list]) => {
    const { profile, range = "asiatique", finish = "blanc" } = list[0];
    const offers = profileOn(market, profile) ? priced(market.offers[profile] ?? [], market, range, finish) : [];
    const uses = new Map<string, ElementUse>();
    for (const p of list) {
      const k = `${p.element}|${p.len}`;
      const u = uses.get(k) ?? { element: p.element, len: p.len, qty: 0, lines: [] };
      u.qty += p.qty;
      if (p.line !== undefined && !u.lines.includes(p.line)) u.lines.push(p.line);
      uses.set(k, u);
    }
    const lens = list.flatMap((p) => Array<number>(p.qty).fill(p.len));
    const { bars, tooLong } = planGroup(lens, offers, kerf);
    const usedLen = bars.reduce((s, b) => s + b.cuts.reduce((a, c) => a + c, 0), 0);
    const totalLen = bars.reduce((s, b) => s + b.length, 0);
    const cost = bars.reduce((s, b) => s + b.price, 0);
    const purchase = [...new Map(bars.map((b) => [`${b.length}|${b.price}`, b])).values()]
      .map((b) => ({ length: b.length, price: b.price, count: bars.filter((x) => x.length === b.length && x.price === b.price).length }))
      .sort((a, b) => b.length - a.length);

    // part de chaque ouvrage : au prorata de la longueur qu'il fait couper (la chute est répartie de la même façon)
    const lineLen: Record<number, number> = {};
    for (const p of list) if (p.line !== undefined && !tooLong.includes(p.len)) lineLen[p.line] = (lineLen[p.line] ?? 0) + p.len * p.qty;
    const sumLen = Object.values(lineLen).reduce((a, b) => a + b, 0) || 1;
    const share = Object.fromEntries(Object.entries(lineLen).map(([l, len]) => [Number(l), { usedLen: len, cost: Math.round((cost * len) / sumLen) }]));

    return {
      key, profile, range, finish, elements: [...uses.values()], lines: [...new Set(list.flatMap((p) => (p.line !== undefined ? [p.line] : [])))].sort((a, b) => a - b),
      bars, purchase, usedLen, totalLen, wasteLen: totalLen - usedLen, wastePct: totalLen ? Math.round(((totalLen - usedLen) / totalLen) * 100) : 0,
      cost, tooLong, noOffer: offers.length === 0, unavailable: !rangeOn(market, range as Line["range"]) || !finishOn(market, finish as FinishId), share,
    };
  });

  const totalLen = groups.reduce((s, g) => s + g.totalLen, 0);
  const usedLen = groups.reduce((s, g) => s + g.usedLen, 0);
  const byLine: Procurement["byLine"] = {};
  for (const g of groups) for (const [l, v] of Object.entries(g.share)) {
    const cur = (byLine[Number(l)] ??= { cost: 0, usedLen: 0 });
    cur.cost += v.cost;
    cur.usedLen += v.usedLen;
  }
  return {
    groups,
    totalCost: groups.reduce((s, g) => s + g.cost, 0),
    bars: groups.reduce((s, g) => s + g.bars.length, 0),
    totalLen,
    usedLen,
    wasteLen: totalLen - usedLen,
    wastePct: totalLen ? Math.round(((totalLen - usedLen) / totalLen) * 100) : 0,
    byLine,
  };
}

// Hypothèses de simulation : tout est local à la page, rien n'est enregistré tant que le menuisier ne le demande pas.
export type Sim = { market: Market; range: "" | Line["range"]; finish: "" | FinishId; pct: number };
export const initSim = (market: Market): Sim => ({ market, range: "", finish: "", pct: 0 });

// Plan d'achat des profilés du devis sous les hypothèses : gamme et couleur imposées à tous les ouvrages, prix du marché majorés de pct %.
export function simulate(lines: Line[], sim: Sim, kerf: number, finish: "" | FinishId = sim.finish) {
  const k = 1 + sim.pct / 100;
  const offers = Object.fromEntries(Object.entries(sim.market.offers).map(([p, os]) => [p, os.map((o) => ({ ...o, price: Math.round(o.price * k) }))]));
  const set = lines.map((l) => ({ ...l, range: sim.range || l.range, finish: finish || l.finish }));
  return procure(allPieces(set), { ...sim.market, offers }, kerf);
}
