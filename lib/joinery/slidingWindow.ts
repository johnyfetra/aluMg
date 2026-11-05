import { type MeshData, mitredFrame, slab } from "./geometry";
import { BEAD, DORMANT_SLIDING, GASKET, SASH } from "./profiles";
import { toEngine } from "./units";

// Fenêtre coulissante décrite par des pièces neutres (géométrie + matière + position) : même description pour tous les moteurs de rendu et tous les modes de scène.
export type Material = "aluminium" | "glass" | "gasket" | "hardware";
export type Part = { name: string; mesh: MeshData; material: Material; position: [number, number, number] };

export function slidingWindow(widthMm: number, heightMm: number, leaves = 2): Part[] {
  const parts: Part[] = [];
  const add = (name: string, mesh: MeshData, material: Material, mm: [number, number, number] = [0, 0, 0]) => parts.push({ name, mesh, material, position: [toEngine(mm[0]), toEngine(mm[1]), toEngine(mm[2])] });
  add("dormant", mitredFrame(DORMANT_SLIDING, widthMm, heightMm), "aluminium");
  const inner = widthMm - 2 * DORMANT_SLIDING.width; // ouverture libre du dormant
  const overlap = 40; // recouvrement des vantaux au croisement
  const lw = (inner + (leaves - 1) * overlap) / leaves; // largeur d'un vantail
  const lh = heightMm - 2 * DORMANT_SLIDING.width - 8; // hauteur d'un vantail (8 mm de jeu)
  for (let i = 0; i < leaves; i++) {
    const x = -inner / 2 + lw / 2 + i * (lw - overlap);
    const z = i % 2 ? -16 : 16; // deux rails : un vantail devant, l'autre derrière
    add(`vantail-${i + 1}`, mitredFrame(SASH, lw, lh), "aluminium", [x, 0, z]);
    const gw = lw - 2 * SASH.width + 22; // le vitrage entre de 11 mm dans la feuillure
    const gh = lh - 2 * SASH.width + 22;
    // double vitrage 4/12/4
    for (const dz of [-8, 8]) add(`vitrage-${i + 1}${dz < 0 ? "a" : "b"}`, slab(gw, gh, 4), "glass", [x, 0, z + dz]);
    for (const dz of [-12.5, 12.5]) add(`joint-${i + 1}`, mitredFrame(GASKET, gw - 6, gh - 6), "gasket", [x, 0, z + dz]);
    for (const dz of [-14.5, 14.5]) add(`parclose-${i + 1}`, mitredFrame(BEAD, gw - 2, gh - 2), "aluminium", [x, 0, z + dz]);
    if (i === 0) add("poignée", slab(14, 130, 10), "hardware", [x + lw / 2 - 30, 0, z + (z > 0 ? 22 : -22)]);
  }
  return parts;
}
