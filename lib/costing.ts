import { allPieces, cutList, unitPrice } from "./calc";
import { DEFAULT_SETTINGS, type Line, type Quote, type Service, type Settings } from "./model";
import { extrasCost, procure } from "./procure";
import { totals } from "./totals";

// Chiffrage au prix de revient : déboursé sec (matière + main-d'œuvre) → prix de revient (+ frais généraux) → prix de vente (+ marge).
// Pur et sans dépendance navigateur : le même calcul sert l'éditeur, le serveur (demandes de clients) et le budget.

export const laborMinutes = (l: Line, labor: Settings["labor"], glassArea: number) => {
  const cuts = cutList(l).pieces.reduce((s, p) => s + p.qty, 0);
  return labor.fixedMin + labor.cutMin * cuts + labor.leafMin * l.leaves + labor.glazingMin * glassArea;
};

export type LineCost = {
  material: number; // profilés + accessoires + verre + panneaux, pour UN ouvrage (barres partagées entre les exemplaires de la ligne)
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
  const material = Math.round((p.totalCost + e.accCost + e.glassCost + e.panelCost) / qty);
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

// Coût interne des prestations (pose, transport…). `unknown` : une prestation facturée n'a pas de coût saisi, donc la marge est sans doute trop haute.
export const servicesCost = (services: Pick<Service, "qty" | "price" | "cost">[] = []) => ({
  cost: Math.round(services.reduce((s, v) => s + v.qty * (v.cost ?? 0), 0)),
  unknown: services.some((v) => v.price > 0 && v.cost === undefined),
});

// Marge d'un devis entier : prix HT après remise moins le coût complet (achats, main-d'œuvre, frais généraux, coût des prestations).
// `purchases` : coût d'achat de la matière (profilés + accessoires + verre + panneaux), déjà calculé par l'appelant avec le bon catalogue.
// Base unique de la marge dans toute l'application : le prix de revient (comme le réglage « marge visée » et le seuil d'alerte) ; `ofSale` la redonne en % du prix de vente.
export function quoteMargin(q: Pick<Quote, "lines" | "terms" | "discount" | "services">, s: Settings, purchases: number) {
  const { ht } = totals(q);
  const labor = laborTotal(q.lines, s);
  const overhead = Math.round(((purchases + labor) * s.overheadPct) / 100);
  const svc = servicesCost(q.services);
  const cost = purchases + labor + overhead + svc.cost;
  const margin = ht - cost;
  return { ht, labor, overhead, servicesCost: svc.cost, servicesUnknown: svc.unknown, cost, margin, pct: cost > 0 ? Math.round((margin / cost) * 100) : 0, ofSale: ht > 0 ? Math.round((margin / ht) * 100) : 0 };
}

// Réglages encore à leur valeur d'exemple, ou prix fournisseurs anciens : un devis chiffré ainsi n'est pas fiable.
export type Calibration = "market" | "tariffs" | "labor" | "stale";
export const STALE_DAYS = 90;
export function calibration(s: Settings, now = Date.now()): Calibration[] {
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const out: Calibration[] = [];
  if (same(s.market.offers, DEFAULT_SETTINGS.market.offers)) out.push("market");
  if (s.pricing === "m2" && same(s.tariffs, DEFAULT_SETTINGS.tariffs)) out.push("tariffs");
  if (s.pricing === "cost" && same(s.labor, DEFAULT_SETTINGS.labor)) out.push("labor");
  const date = s.market.priceDate ? Date.parse(s.market.priceDate) : NaN;
  if (!out.includes("market") && !(date > now - STALE_DAYS * 864e5)) out.push("stale"); // prix personnalisés mais jamais datés, ou datés de plus de 90 jours
  return out;
}
