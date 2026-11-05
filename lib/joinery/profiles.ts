// Sections de profilés aluminium (millimètres). Repère d'une section : x = distance vers l'intérieur de l'ouvrage depuis le bord extérieur du profilé (0 = face extérieure du cadre),
// y = profondeur (axe du mur), centré. Le polygone extérieur est antihoraire ; les chambres (creux) sont des trous.
export type Pt = readonly [number, number];
export type Section = { name: string; depth: number; width: number; outer: Pt[]; holes: Pt[][] };

// Dormant coulissant : caisson à deux chambres, marche intérieure qui reçoit le vantail (feuillure) et goutte d'eau côté extérieur.
export const DORMANT_SLIDING: Section = {
  name: "dormant-coulissant",
  depth: 60,
  width: 50,
  outer: [[0, -30], [38, -30], [38, -15], [50, -15], [50, 15], [38, 15], [38, 30], [0, 30]],
  holes: [[[4, -26], [34, -26], [34, -3], [4, -3]], [[4, 3], [34, 3], [34, 26], [4, 26]]],
};

// Ouvrant (vantail) : caisson avec feuillure de vitrage côté intérieur ; la parclose (clip) vient fermer la feuillure.
export const SASH: Section = {
  name: "ouvrant",
  depth: 34,
  width: 38,
  outer: [[0, -17], [38, -17], [38, -11], [27, -11], [27, 11], [38, 11], [38, 17], [0, 17]],
  holes: [[[3, -13], [23, -13], [23, 13], [3, 13]]],
};

// Parclose : petit profilé clipsé qui maintient le vitrage.
export const BEAD: Section = {
  name: "parclose",
  depth: 10,
  width: 11,
  outer: [[0, -5], [11, -5], [11, 5], [0, 5]],
  holes: [],
};

// Joint d'étanchéité noir autour du vitrage.
export const GASKET: Section = { name: "joint", depth: 8, width: 4, outer: [[0, -4], [4, -4], [4, 4], [0, 4]], holes: [] };

// Même section à une autre largeur et une autre profondeur : le dessin garde ses proportions (feuillure, chambres), les cotes suivent la gamme choisie.
export function scaledSection(s: Section, widthMm: number, depthMm: number): Section {
  const kx = widthMm / s.width;
  const ky = depthMm / s.depth;
  const f = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [x * kx, y * ky] as const);
  return { ...s, width: widthMm, depth: depthMm, outer: f(s.outer), holes: s.holes.map(f) };
}
