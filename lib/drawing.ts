import { FINISHES, type Line, leafMotion } from "./model";

export type Drawable = Pick<
  Line,
  "category" | "opening" | "leaves" | "direction" | "shutter" | "control" | "guard" | "infill" | "finish" | "glassType" | "thickness" | "pattern" | "range" | "extras" | "width" | "height"
>;

const GLASS_FILL: Record<string, string> = {
  clair: "#dbeafe",
  "teinte-bronze": "#cbb497",
  "teinte-gris": "#9aa5b1",
  "teinte-vert": "#a8c9b5",
  reflechissant: "#8fb2d6",
  feuillete: "#cfe0f5",
  trempe: "#dbeafe",
  depoli: "#eef2f7",
};
const INK = "#0f172a";

// Texture de chaque motif de verre (carreau de 4 à 12 px répété).
const PATTERNS: Record<string, string> = {
  granite: `<pattern id="{id}" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="${INK}" fill-opacity=".4"/><circle cx="3" cy="3" r=".8" fill="${INK}" fill-opacity=".4"/></pattern>`,
  martele: `<pattern id="{id}" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="3.4" fill="none" stroke="${INK}" stroke-opacity=".35" stroke-width=".8"/></pattern>`,
  cathedrale: `<pattern id="{id}" width="12" height="9" patternUnits="userSpaceOnUse"><path d="M0 4.5Q3 0 6 4.5T12 4.5" fill="none" stroke="${INK}" stroke-opacity=".35" stroke-width=".9"/></pattern>`,
  cannele: `<pattern id="{id}" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M2.5 0V5" stroke="${INK}" stroke-opacity=".38" stroke-width="1"/></pattern>`,
};

// Schéma technique en SVG (vue de face) mis à l'échelle pour tenir dans maxW x maxH.
// Reflète : gamme (épaisseur du profilé, rupture de pont thermique), couleur, nombre de vantaux, remplissage,
// type/épaisseur/motif du verre, moustiquaire, grille et motorisation.
export function drawingSvg(l: Drawable, uid = "a", maxW = 260, maxH = 200) {
  const id = uid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || "a";
  const { width, height } = l;
  const ox = 40;
  const oy = 12;
  const s = Math.min((maxW - ox - 12) / Math.max(width, 1), (maxH - oy - 34) / Math.max(height, 1));
  const fw = width * s;
  const fh = height * s;
  const W = Math.round(ox + fw + 12);
  const H = Math.round(oy + fh + 34);
  const euro = l.range === "europeen";
  const t = Math.max(4, Math.min(8, Math.min(fw, fh) * 0.05)) * (euro ? 1.3 : 1);
  const hex = FINISHES.find((f) => f.id === l.finish)?.hex ?? "#f5f5f2";
  const f = (n: number) => n.toFixed(1);
  const rect = (x: number, y: number, w: number, h: number, a: string) => `<rect x="${f(x)}" y="${f(y)}" width="${f(Math.max(w, 0))}" height="${f(Math.max(h, 0))}" ${a}/>`;
  const line = (x1: number, y1: number, x2: number, y2: number, extra = "", sw = 1) =>
    `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${INK}" stroke-width="${sw}" ${extra}/>`;
  const FRAME = `fill="${hex}" stroke="${INK}" stroke-width="1.2"`;
  const defs: string[] = [];
  let body = "";

  // Profilé : la gamme européenne montre une rupture de pont thermique (trait sombre au milieu du profilé).
  const frame = (x: number, y: number, w: number, h: number) => {
    let out = rect(x, y, w, h, FRAME);
    if (euro && w > t * 3 && h > t * 3) out += rect(x + t * 0.45, y + t * 0.45, w - t * 0.9, h - t * 0.9, `fill="none" stroke="${INK}" stroke-opacity=".55" stroke-width="1.6"`);
    return out;
  };

  // Verre : teinte, reflets, motif, feuilleté (double contour), double vitrage (contour intérieur), trempé (marque « T »).
  const pat = l.pattern !== "none" ? PATTERNS[l.pattern] : undefined;
  if (pat) defs.push(pat.replace("{id}", `pt${id}`));
  if (l.glassType === "reflechissant") defs.push(`<linearGradient id="rf${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8f1fb"/><stop offset=".5" stop-color="#7ea3c9"/><stop offset="1" stop-color="#b9d0e8"/></linearGradient>`);
  if (l.glassType === "depoli") defs.push(`<pattern id="dp${id}" width="3" height="3" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".6" fill="#fff" fill-opacity=".9"/></pattern>`);
  const double = l.thickness.includes("/");
  const glass = (x: number, y: number, w: number, h: number) => {
    if (w <= 1 || h <= 1) return "";
    const fill = l.glassType === "reflechissant" ? `url(#rf${id})` : (GLASS_FILL[l.glassType] ?? GLASS_FILL.clair);
    let out = rect(x, y, w, h, `fill="${fill}" stroke="${INK}" stroke-width="1"`);
    if (l.glassType === "depoli") out += rect(x, y, w, h, `fill="url(#dp${id})"`);
    if (pat) out += rect(x, y, w, h, `fill="url(#pt${id})"`);
    if (l.glassType !== "depoli" && w > 14 && h > 14) out += `<path d="M${f(x + w * 0.18)},${f(y + h * 0.9)} L${f(x + w * 0.5)},${f(y + h * 0.1)} M${f(x + w * 0.3)},${f(y + h * 0.9)} L${f(x + w * 0.62)},${f(y + h * 0.1)}" stroke="#fff" stroke-opacity=".55" stroke-width="2"/>`;
    if (double) out += rect(x + 2.5, y + 2.5, w - 5, h - 5, `fill="none" stroke="${INK}" stroke-opacity=".5" stroke-width=".8"`);
    if (l.glassType === "feuillete") out += rect(x + 1.5, y + 1.5, w - 3, h - 3, `fill="none" stroke="#1d4ed8" stroke-opacity=".6" stroke-width=".8" stroke-dasharray="2 1.5"`);
    if (l.glassType === "trempe" && w > 20 && h > 20) out += `<text x="${f(x + w - 4)}" y="${f(y + h - 4)}" font-family="Helvetica,Arial,sans-serif" font-size="8" font-weight="700" fill="${INK}" fill-opacity=".6" text-anchor="end">T</text>`;
    return out;
  };

  // Un vantail : cadre + remplissage (verre, panneau plein ou les deux).
  const leaf = (x: number, y: number, w: number, h: number) => {
    let out = frame(x, y, w, h);
    const ix = x + t * 0.75;
    const iy = y + t * 0.75;
    const iw = w - 1.5 * t;
    const ih = h - 1.5 * t;
    const solid = (sx: number, sy: number, sw: number, sh: number) =>
      rect(sx, sy, sw, sh, `fill="${hex}" stroke="${INK}" stroke-width="1"`) + rect(sx + 4, sy + 4, sw - 8, sh - 8, `fill="none" stroke="${INK}" stroke-opacity=".6" stroke-width=".7"`);
    if (l.category === "porte" && l.infill === "pleine") out += solid(ix, iy, iw, ih);
    else if (l.category === "porte" && l.infill === "semi") out += glass(ix, iy, iw, ih * 0.6) + solid(ix, iy + ih * 0.6, iw, ih * 0.4);
    else out += glass(ix, iy, iw, ih);
    return out;
  };
  const arrow = (cx: number, cy: number, dir: 1 | -1) =>
    `<path d="M${f(cx - dir * 12)},${f(cy)} L${f(cx + dir * 12)},${f(cy)} M${f(cx + dir * 12)},${f(cy)} l${-dir * 6},-4 M${f(cx + dir * 12)},${f(cy)} l${-dir * 6},4" stroke="${INK}" stroke-width="1.4" fill="none"/>`;
  const dashed = (pts: string) => `<polyline points="${pts}" fill="none" stroke="${INK}" stroke-width="1" stroke-dasharray="4 3"/>`;

  if (l.category === "volet") {
    const box = Math.min(fh * 0.16, 30);
    body += frame(ox, oy, fw, box) + rect(ox, oy + box, t, fh - box, FRAME) + rect(ox + fw - t, oy + box, t, fh - box, FRAME);
    const rideau = l.shutter === "rideau";
    const n = rideau ? Math.max(5, Math.min(14, Math.round((fh - box) / 14))) : Math.max(6, Math.min(24, Math.round((fh - box) / 9)));
    for (let i = 0; i <= n; i++) {
      const y = oy + box + ((fh - box) * i) / n;
      body += line(ox + t, y, ox + fw - t, y);
      if (rideau && i < n) body += line(ox + t, y + (fh - box) / n / 2, ox + fw - t, y + (fh - box) / n / 2, 'stroke-dasharray="2 3" opacity="0.5"');
    }
    if (l.control === "motorise") {
      const r = Math.min(9, box / 2);
      body += `<circle cx="${f(ox + fw - r - 4)}" cy="${f(oy + box / 2)}" r="${f(r)}" fill="#fff" stroke="${INK}" stroke-width="1"/><text x="${f(ox + fw - r - 4)}" y="${f(oy + box / 2 + 3.5)}" font-family="Helvetica,Arial,sans-serif" font-size="10" font-weight="700" text-anchor="middle" fill="${INK}">M</text>`;
    }
  } else if (l.category === "garde-corps") {
    const spans = Math.max(1, Math.ceil(width / 1200));
    const post = Math.max(3, t * 0.8);
    const rail = Math.max(3, t * 0.9);
    const inner = fh - 2 * rail;
    if (l.guard === "barreaudage") {
      const nb = Math.max(4, Math.min(60, Math.ceil(width / 120)));
      for (let i = 0; i < nb; i++) body += rect(ox + ((fw - post) * (i + 0.5)) / nb, oy + rail, 1.6, inner, `fill="${hex}" stroke="${INK}" stroke-width=".6"`);
    } else {
      for (let i = 0; i < spans; i++) {
        const gx = ox + (fw * i) / spans + post;
        body += glass(gx + 2, oy + rail + 4, fw / spans - post - 4, inner - 8);
      }
    }
    body += rect(ox, oy, fw, rail, FRAME) + rect(ox, oy + fh - rail, fw, rail, FRAME);
    for (let i = 0; i <= spans; i++) body += rect(ox + (fw - post) * (i / spans), oy, post, fh, FRAME);
  } else if (l.category === "cloison") {
    body += frame(ox, oy, fw, fh);
    const n = l.leaves;
    const iw = fw - 2 * t;
    const mull = Math.max(3, t * 0.7);
    const pw = (iw - (n - 1) * mull) / n;
    for (let i = 0; i < n; i++) {
      const x = ox + t + i * (pw + mull);
      body += glass(x, oy + t, pw, fh - 2 * t);
      if (i < n - 1) body += rect(x + pw, oy + t, mull, fh - 2 * t, FRAME);
    }
  } else {
    body += frame(ox, oy, fw, fh);
    const ix = ox + t;
    const iy = oy + t;
    const iw = fw - 2 * t;
    const ih = fh - 2 * t;
    const n = l.leaves;
    if (l.opening === "fixe") body += glass(ix, iy, iw, ih);
    else if (l.opening === "jalousie") {
      // naco : lames de verre horizontales dans deux montants
      const k = Math.max(4, Math.min(16, Math.round(ih / 14)));
      body += rect(ix, iy, iw, ih, `fill="${hex}" stroke="${INK}" stroke-width="1"`);
      for (let i = 0; i < k; i++) body += glass(ix + t * 0.6, iy + 2 + ((ih - 4) * i) / k, iw - t * 1.2, (ih - 4) / k - 2);
    } else if (l.opening === "coulissant") {
      const ov = t * 2;
      const vw = (iw + (n - 1) * ov) / n;
      const motion = leafMotion(l);
      // les vantaux fixes d'abord, les mobiles par-dessus ; la flèche indique le sens de glissement
      for (const front of [false, true])
        for (let i = 0; i < n; i++) {
          if (motion[i].front !== front) continue;
          const x = ix + i * (vw - ov);
          body += leaf(x, iy + (front ? 0 : 1), vw, ih - 1);
          if (motion[i].slide !== 0 && vw > 30) body += arrow(x + vw / 2, iy + ih / 2, motion[i].slide as 1 | -1);
        }
    } else {
      const vw = iw / n;
      for (let i = 0; i < n; i++) {
        const x = ix + i * vw;
        body += leaf(x, iy, vw, ih);
        const hingeLeft = leafMotion(l)[i].hingeLeft;
        const [a, b] = hingeLeft ? [x + vw - t, x + t] : [x + t, x + vw - t];
        if (l.opening === "soufflet") body += dashed(`${f(x + t)},${f(iy + ih - t)} ${f(x + vw / 2)},${f(iy + t)} ${f(x + vw - t)},${f(iy + ih - t)}`);
        else {
          body += dashed(`${f(a)},${f(iy + t)} ${f(b)},${f(iy + ih / 2)} ${f(a)},${f(iy + ih - t)}`);
          if (l.opening === "oscillo") body += dashed(`${f(x + t)},${f(iy + t)} ${f(x + vw / 2)},${f(iy + ih - t)} ${f(x + vw - t)},${f(iy + t)}`);
        }
        const hx = l.opening === "soufflet" ? x + vw / 2 - 8 : hingeLeft ? x + vw - t * 1.8 : x + t * 1.2;
        body += l.opening === "soufflet" ? rect(hx, iy + ih - t * 1.9, 16, t * 0.6, `fill="${INK}"`) : rect(hx, iy + ih / 2 - 8, t * 0.6, 16, `fill="${INK}"`);
      }
    }
    // Moustiquaire : trame fine sur toute l'ouverture. Grille de sécurité : barreaux verticaux.
    if (l.extras.includes("moustiquaire")) {
      defs.push(`<pattern id="ms${id}" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 0H3M0 0V3" stroke="${INK}" stroke-opacity=".22" stroke-width=".5"/></pattern>`);
      body += rect(ix, iy, iw, ih, `fill="url(#ms${id})"`);
    }
    if (l.extras.includes("grille")) {
      const nb = Math.max(3, Math.round(iw / 14));
      for (let i = 1; i < nb; i++) body += line(ix + (iw * i) / nb, iy, ix + (iw * i) / nb, iy + ih, 'stroke-opacity=".75"', 2);
      body += line(ix, iy + ih / 2, ix + iw, iy + ih / 2, 'stroke-opacity=".75"', 2);
    }
  }

  const dim = `<g font-family="Helvetica,Arial,sans-serif" font-size="11" fill="${INK}" text-anchor="middle">
    <line x1="${ox}" x2="${f(ox + fw)}" y1="${f(oy + fh + 12)}" y2="${f(oy + fh + 12)}" stroke="${INK}" stroke-width="0.8"/>
    <text x="${f(ox + fw / 2)}" y="${f(oy + fh + 26)}">${width} mm</text>
    <line x1="${ox - 12}" x2="${ox - 12}" y1="${oy}" y2="${f(oy + fh)}" stroke="${INK}" stroke-width="0.8"/>
    <text transform="translate(${ox - 17},${f(oy + fh / 2)}) rotate(-90)">${height} mm</text></g>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs.join("")}</defs>${body}${dim}</svg>`;
  return { svg, w: W, h: H };
}

export async function svgToPng(svg: string, w: number, h: number, scale = 3) {
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await img.decode();
  const c = document.createElement("canvas");
  c.width = w * scale;
  c.height = h * scale;
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/png");
}
