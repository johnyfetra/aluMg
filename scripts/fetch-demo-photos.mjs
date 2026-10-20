/**
 * Télécharge de VRAIES photos libres (Pexels, licence Pexels : usage libre, attribution non obligatoire mais créditée dans public/demo/CREDITS.md)
 * et les prépare pour les réalisations de démonstration : public/demo/work/<ouvrage>-1..3.jpg + <ouvrage>-thumb.jpg.
 * Usage : node scripts/fetch-demo-photos.mjs      (nécessite un accès Internet)
 * Les photos illustrent le TYPE d'ouvrage (baie, porte, volet, garde-corps…), pas un chantier d'un menuisier réel : à remplacer par les vraies réalisations.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const PHOTOS = {
  baie3: [31817163, 5490295, 8134753],
  coul2: [7031618, 7118799, 920025],
  porteCoul: [7031607, 1098982, 32367382],
  porteOuv: [19227220, 10586212, 4682153],
  volet: [16194722, 9351440, 20142586],
  rideau: [3102320, 31487468],
  naco: [18758239, 10096840],
  oscillo: [11578141, 19503548, 10586212],
  gardeVerre: [20433821, 4178801, 18218174],
  gardeBar: [17398459, 12246538, 11837460],
  cloison: [3801167, 8971808, 5511093],
  baieFixe: [8971808, 3801167],
  ouv2: [2290609, 4682153],
  coul4: [31817163, 8134753],
};

const OUT = "public/demo/work";
mkdirSync(OUT, { recursive: true });
const cache = new Map();
async function get(id) {
  if (!cache.has(id)) {
    const res = await fetch(`https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1400`, { headers: { "User-Agent": "Mozilla/5.0 AluMgDemo" } });
    if (!res.ok) throw new Error(`photo ${id}: ${res.status}`);
    cache.set(id, Buffer.from(await res.arrayBuffer()));
  }
  return cache.get(id);
}
for (const [scene, ids] of Object.entries(PHOTOS)) {
  for (const [i, id] of ids.entries()) {
    const buf = await get(id);
    await sharp(buf).resize(1000, 667, { fit: "cover", position: "attention" }).jpeg({ quality: 78, mozjpeg: true }).toFile(`${OUT}/${scene}-${i + 1}.jpg`);
    if (i === 0) await sharp(buf).resize(420, 280, { fit: "cover", position: "attention" }).jpeg({ quality: 72, mozjpeg: true }).toFile(`${OUT}/${scene}-thumb.jpg`);
  }
  console.log(scene, ids.length, "photos");
}
const all = [...new Set(Object.values(PHOTOS).flat())].sort((a, b) => a - b);
writeFileSync("public/demo/CREDITS.md", `# Crédits des photos de démonstration\n\nPhotos issues de [Pexels](https://www.pexels.com) (licence Pexels : usage gratuit, y compris commercial). Elles illustrent des types d'ouvrages ; elles ne représentent pas des chantiers réels des menuisiers de démonstration.\n\n${all.map((id) => `- https://www.pexels.com/photo/${id}/`).join("\n")}\n`);
console.log(all.length, "photos uniques");
