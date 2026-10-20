/**
 * Produit les images de démonstration dans public/demo/ :
 *   work/    photos de réalisations (rendus 3D de l'appli, mur, sol, ciel), 3 prises de vue par ouvrage + miniature
 *   logos/   logos des menuiseries (SVG)
 *   avatars/ photos de profil (illustrations SVG)
 * Nécessite `npm run dev` (page /demo-render) et Chrome. Usage : node scripts/make-demo-assets.mjs [--only svg]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { AVATARS, LOGOS, SCENES, VIEWS } from "./demo-data.mjs";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "public/demo";
for (const d of ["work", "logos", "avatars"]) mkdirSync(`${OUT}/${d}`, { recursive: true });

// ---------- Photos de profil : portraits stylisés ----------
const avatar = ({ skin, hair, style, shirt, bg, glasses, beard }, id) => {
  const hairBack = style === "long" ? `<path d="M64 110c-6-52 22-78 64-78s70 26 64 78l-8 56H72z" fill="${hair}"/>` : "";
  const hairTop =
    style === "curly"
      ? `<g fill="${hair}">${[[84, 74], [104, 56], [128, 50], [152, 56], [172, 74], [92, 92], [164, 92]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="19"/>`).join("")}</g>`
      : style === "long"
        ? `<path d="M80 96c0-34 20-52 48-52s48 18 48 52c-14-18-30-26-48-26s-34 8-48 26z" fill="${hair}"/>`
        : `<path d="M82 98c-4-38 18-56 46-56s50 18 46 56c-8-14-20-24-46-24S90 84 82 98z" fill="${hair}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
<defs><linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient><clipPath id="c${id}"><rect width="256" height="256"/></clipPath></defs>
<g clip-path="url(#c${id})"><rect width="256" height="256" fill="url(#bg${id})"/>
${hairBack}
<path d="M28 256c4-52 40-70 100-70s96 18 100 70z" fill="${shirt}"/>
<path d="M108 186h40v-26h-40z" fill="${skin}"/><path d="M108 168c6 10 14 14 20 14s14-4 20-14v-10h-40z" fill="rgba(0,0,0,.14)"/>
<ellipse cx="128" cy="118" rx="44" ry="52" fill="${skin}"/>
<ellipse cx="84" cy="124" rx="7" ry="11" fill="${skin}"/><ellipse cx="172" cy="124" rx="7" ry="11" fill="${skin}"/>
${hairTop}
${beard ? `<path d="M90 130c2 34 18 46 38 46s36-12 38-46c-8 14-20 20-38 20s-30-6-38-20z" fill="${hair}" opacity=".9"/>` : ""}
<g fill="#1d140f"><ellipse cx="112" cy="120" rx="4.6" ry="5.6"/><ellipse cx="144" cy="120" rx="4.6" ry="5.6"/></g>
<path d="M100 106q12-8 24-2M132 104q12-6 24 2" stroke="${hair}" stroke-width="4" fill="none" stroke-linecap="round"/>
<path d="M114 146q14 12 28 0" stroke="#5a2a20" stroke-width="4" fill="none" stroke-linecap="round"/>
${glasses ? `<g fill="none" stroke="#2a2a2a" stroke-width="3.5"><circle cx="112" cy="120" r="15"/><circle cx="144" cy="120" r="15"/><path d="M127 120h2"/></g>` : ""}
</g></svg>`;
};

// ---------- Logos : emblèmes simples sur carré dégradé ----------
const glyph = (kind) => {
  const w = "#ffffff";
  switch (kind) {
    case "grid": return `<g fill="none" stroke="${w}" stroke-width="9" stroke-linejoin="round"><rect x="56" y="52" width="128" height="112" rx="8"/><path d="M120 52v112M56 108h128"/></g>`;
    case "sun": return `<g fill="${w}"><circle cx="120" cy="104" r="34"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="116" y="38" width="8" height="20" rx="4" transform="rotate(${a} 120 104)"/>`).join("")}</g>`;
    case "hex": return `<g fill="none" stroke="${w}" stroke-width="9" stroke-linejoin="round"><path d="M120 44l56 32v64l-56 32-56-32V76z"/><path d="M120 44v64l56 32M120 108L64 140"/></g>`;
    case "wave": return `<g fill="none" stroke="${w}" stroke-width="9" stroke-linecap="round"><path d="M50 100q17-22 35 0t35 0 35 0 35 0"/><path d="M50 134q17-22 35 0t35 0 35 0 35 0"/><path d="M50 66q17-22 35 0t35 0 35 0 35 0" opacity=".6"/></g>`;
    case "arch": return `<g fill="none" stroke="${w}" stroke-width="9" stroke-linejoin="round"><path d="M64 168V104a56 56 0 0 1 112 0v64z"/><path d="M120 48v120M64 112h112"/></g>`;
    default: return `<g fill="none" stroke="${w}" stroke-width="9" stroke-linejoin="round"><path d="M120 44l60 22v50c0 30-24 50-60 64-36-14-60-34-60-64V66z"/><path d="M120 44v136M60 110h120"/></g>`;
  }
};
const logo = ({ kind, a, b, text }, id) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
<defs><linearGradient id="l${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
<rect width="240" height="240" rx="52" fill="url(#l${id})"/>${glyph(kind)}
<text x="120" y="214" font-family="Helvetica,Arial,sans-serif" font-weight="700" font-size="30" fill="#fff" text-anchor="middle" letter-spacing="3">${text}</text></svg>`;

for (const [k, v] of Object.entries(AVATARS)) writeFileSync(`${OUT}/avatars/${k}.svg`, avatar(v, k));
for (const [k, v] of Object.entries(LOGOS)) writeFileSync(`${OUT}/logos/${k}.svg`, logo(v, k));
console.log("SVG : ok");
if (process.argv.includes("--only") && process.argv.includes("svg")) process.exit(0);

// ---------- Photos de réalisations : rendus 3D ----------
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 800 });
for (const [id, params] of Object.entries(SCENES)) {
  for (const [i, v] of VIEWS.entries()) {
    await page.goto(`${BASE}/demo-render?${params}&az=${v.az}&el=${v.el}&dist=${v.dist}`, { waitUntil: "networkidle0", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 3800)); // le ressort d'ouverture se stabilise
    const shot = await page.screenshot({ type: "jpeg", quality: 92 });
    await sharp(shot).resize(1000, 667).jpeg({ quality: 78, mozjpeg: true }).toFile(`${OUT}/work/${id}-${i + 1}.jpg`);
    if (i === 0) await sharp(shot).resize(420, 280).jpeg({ quality: 72, mozjpeg: true }).toFile(`${OUT}/work/${id}-thumb.jpg`);
    console.log("rendu", id, i + 1);
  }
}
await browser.close();
