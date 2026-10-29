import { salePrice } from "@/lib/costing";
import { FINISHES, type Category, type Line, finishOn, rangeOn, RANGES, type Settings } from "@/lib/model";

// Valeurs de départ et prix d'un ouvrage (partagés par l'éditeur, la demande client et les cartes d'ouvrage).
export const DEFAULT_SIZE: Record<Category, [number, number]> = {
  fenetre: [1200, 1000],
  porte: [900, 2100],
  volet: [1200, 1500],
  "garde-corps": [2000, 1000],
  cloison: [2400, 2400],
};
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const price = (l: Line, s: Settings) => salePrice(l, s);

export function newLine(s: Settings): Line {
  const base: Line = {
    id: crypto.randomUUID(),
    category: "fenetre",
    opening: "coulissant",
    leaves: 2,
    shutter: "roulant",
    control: "manuel",
    guard: "barreaudage",
    range: RANGES.find((r) => rangeOn(s.market, r)) ?? "asiatique", // premier choix que les fournisseurs ont
    finish: FINISHES.find((f) => finishOn(s.market, f.id))?.id ?? "blanc",
    infill: "vitree",
    glassType: "clair",
    thickness: "5",
    pattern: "none",
    extras: [],
    width: DEFAULT_SIZE.fenetre[0],
    height: DEFAULT_SIZE.fenetre[1],
    qty: 1,
    unit: 0,
  };
  return { ...base, unit: price(base, s) };
}
