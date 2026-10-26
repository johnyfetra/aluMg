import { allPieces, cutList, unitPrice } from "./calc";
import { type Line, type Settings } from "./model";
import { extrasCost, procure } from "./procure";

// Chiffrage au prix de revient : déboursé sec (matière + main-d'œuvre) → prix de revient (+ frais généraux) → prix de vente (+ marge).
// Pur et sans dépendance navigateur : le même calcul sert l'éditeur, le serveur (demandes de clients) et le budget.

export const laborMinutes = (l: Line, labor: Settings["labor"], glassArea: number) => {
  const cuts = cutList(l).pieces.reduce((s, p) => s + p.qty, 0);
  return labor.fixedMin + labor.cutMin * cuts + labor.leafMin * l.leaves + labor.glazingMin * glassArea;
};

export type LineCost = {
  material: number; // profilés + accessoires + verre, pour UN ouvrage (barres partagées entre les exemplaires de la ligne)
  labor: number; // main-d'œuvre d'un ouvrage
  direct: number; // déboursé sec
  full: number; // prix de revient (avec frais généraux)
  price: number; // prix de vente conseillé, arrondi au millier d'Ar supérieur
  incomplete: boolean; // un profilé sans offre du marché : le coût est sous-estimé
};

// shortcut: un ouvrage est chiffré seul (il paie ses barres entières, moins ses exemplaires) : prudent ; la chute partagée du devis entier se lit dans le budget.
export function costLine(l: Line, s: Settings): LineCost {
  const qty = Math.max(1, l.qty);
  const p = procure(allPieces([l]), s.market, s.kerf);
  const e = extrasCost([l], s.market);
  const material = Math.round((p.totalCost + e.accCost + e.glassCost) / qty);
  const labor = Math.round(((laborMinutes(l, s.labor, e.glassArea / qty) / 60) * s.labor.rate));
  const direct = material + labor;
  const full = Math.round(direct * (1 + s.overheadPct / 100));
  const price = Math.ceil((full * (1 + s.marginPct / 100)) / 1000) * 1000;
  return { material, labor, direct, full, price, incomplete: p.groups.some((g) => g.noOffer) };
}

// Prix de vente unitaire d'un ouvrage selon le mode choisi dans les réglages.
export const salePrice = (l: Line, s: Settings) => (s.pricing === "cost" ? costLine(l, s).price : unitPrice(l, s.tariffs, s.surcharges, s.minArea));

// Marge d'un prix de vente sur le prix de revient, en % du prix de revient (négatif : vente à perte).
export const marginOf = (unit: number, full: number) => (full > 0 ? Math.round(((unit - full) / full) * 100) : 0);

// Coût de main-d'œuvre total d'un devis (toutes quantités), pour le budget.
export const laborTotal = (lines: Line[], s: Settings) =>
  Math.round(lines.reduce((sum, l) => sum + ((laborMinutes(l, s.labor, extrasCost([l], s.market).glassArea / Math.max(1, l.qty)) / 60) * s.labor.rate) * l.qty, 0));
