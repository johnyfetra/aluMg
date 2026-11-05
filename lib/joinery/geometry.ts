import * as THREE from "three";
import { toEngine } from "./units";
import type { Section } from "./profiles";

// Géométrie neutre (tableaux typés) : consommée telle quelle par Three.js ou Babylon.js, sans dépendre d'un moteur de rendu.
export type MeshData = { positions: Float32Array; normals: Float32Array; uvs: Float32Array; indices: Uint32Array | null };

const dataOf = (g: THREE.BufferGeometry): MeshData => {
  g.computeVertexNormals();
  const pos = g.getAttribute("position").array as Float32Array;
  const nor = g.getAttribute("normal").array as Float32Array;
  // UV planaires (vue de face), échelle d'une répétition par mètre : le fil des finitions bois suit le profilé
  const uvs = new Float32Array((pos.length / 3) * 2);
  for (let i = 0; i < pos.length / 3; i++) { uvs[i * 2] = pos[i * 3]; uvs[i * 2 + 1] = pos[i * 3 + 1]; }
  return { positions: new Float32Array(pos), normals: new Float32Array(nor), uvs, indices: g.index ? new Uint32Array(g.index.array) : null };
};

// Cadre rectangulaire assemblé à coupes d'onglet à 45° : le profilé est extrudé sur chaque côté puis ses extrémités sont ramenées sur la diagonale.
// Dimensions extérieures en millimètres ; résultat en mètres, centré en (0, 0), profondeur centrée sur z = 0.
export function mitredFrame(section: Section, outerW: number, outerH: number): MeshData {
  return merge(mitredFrameSides(section, outerW, outerH));
}

// Les quatre côtés séparément (haut, bas, gauche, droite) : le visualiseur met en valeur les traverses ou les montants d'un côté à la fois.
export function mitredFrameSides(section: Section, outerW: number, outerH: number): MeshData[] {
  type Side = { len: number; map: (u: number, d: number, z: number) => [number, number, number]; flip: boolean };
  const sides: Side[] = [
    { len: outerW, map: (u, d, z) => [-outerW / 2 + u, outerH / 2 - d, z], flip: false }, // haut
    { len: outerW, map: (u, d, z) => [-outerW / 2 + u, -outerH / 2 + d, z], flip: true }, // bas
    { len: outerH, map: (u, d, z) => [-outerW / 2 + d, -outerH / 2 + u, z], flip: false }, // gauche
    { len: outerH, map: (u, d, z) => [outerW / 2 - d, -outerH / 2 + u, z], flip: true }, // droite
  ];
  const parts: MeshData[] = [];
  for (const s of sides) {
    const shape = new THREE.Shape(section.outer.map(([x, y]) => new THREE.Vector2(x, y)));
    shape.holes = section.holes.map((h) => new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
    const g = new THREE.ExtrudeGeometry(shape, { depth: s.len, bevelEnabled: false, curveSegments: 1 });
    const p = g.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const d = p.getX(i); // distance vers l'intérieur
      const z = p.getZ(i); // 0 ou longueur
      const u = z < 1e-6 ? d : s.len - d; // onglet : l'extrémité recule de la profondeur du profilé
      const [x, y, zz] = s.map(u, d, p.getY(i));
      p.setXYZ(i, toEngine(x), toEngine(y), toEngine(zz));
    }
    if (s.flip) {
      // un côté en miroir retourne l'orientation des triangles
      const a = p.array as Float32Array;
      for (let i = 0; i < a.length; i += 9) for (let k = 0; k < 3; k++) { const t = a[i + 3 + k]; a[i + 3 + k] = a[i + 6 + k]; a[i + 6 + k] = t; }
    }
    parts.push(dataOf(g));
  }
  return parts;
}

// Plaque rectangulaire (vitrage, tôle) : largeur × hauteur × épaisseur en millimètres, centrée.
export function slab(w: number, h: number, t: number): MeshData {
  const g = new THREE.BoxGeometry(toEngine(w), toEngine(h), toEngine(t));
  return dataOf(g.toNonIndexed());
}

export function merge(parts: MeshData[]): MeshData {
  const n = parts.reduce((s, p) => s + p.positions.length, 0);
  const positions = new Float32Array(n);
  const normals = new Float32Array(n);
  const uvs = new Float32Array((n / 3) * 2);
  let o = 0;
  for (const p of parts) { positions.set(p.positions, o); normals.set(p.normals, o); uvs.set(p.uvs, (o / 3) * 2); o += p.positions.length; }
  return { positions, normals, uvs, indices: null };
}

export function bounds(d: MeshData) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < d.positions.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], d.positions[i + k]); max[k] = Math.max(max[k], d.positions[i + k]); }
  return { min, max, size: max.map((v, k) => v - min[k]) };
}
