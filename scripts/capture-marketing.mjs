// Captures de la vitrine (public/marketing/*.webp) prises sur l'application telle qu'elle est, avec les comptes de démonstration.
// Usage : serveur lancé (npm run dev), puis `node scripts/capture-marketing.mjs [url]` (défaut http://localhost:3001).
// Chaque écran est pris en clair et en sombre ; bureau 1500 × 938, téléphone 780 × 1688 (390 × 844 en densité 2).
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const BASE = process.argv[2] ?? "http://localhost:3001";
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = new URL("../public/marketing/", import.meta.url);
const DESKTOP = { width: 1500, height: 938, deviceScaleFactor: 2 };
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
// masque l'indicateur de développement de Next et le pointeur de saisie : rien qui n'existe pas pour l'utilisateur
const CLEAN = "nextjs-portal{display:none!important} *{caret-color:transparent!important}";

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage();
  const login = async (role) => {
    await page.goto(`${BASE}/connexion`, { waitUntil: "networkidle2" });
    const status = await page.evaluate(async (r) => (await fetch(`/api/auth/demo-${r}`, { method: "POST" })).status, role);
    if (status !== 200) throw new Error(`connexion démo ${role} : ${status}`);
  };
  const firstId = (api) => page.evaluate(async (u) => (await (await fetch(u)).json())[0]?.id, api);
  const shoot = async (name, path, viewport) => {
    await page.setViewport(viewport);
    for (const theme of ["light", "dark"]) {
      await page.evaluate((t) => localStorage.setItem("alumg.theme", t), theme);
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle2" });
      await page.addStyleTag({ content: CLEAN });
      await new Promise((r) => setTimeout(r, 1200)); // polices, images et entrées animées
      const png = await page.screenshot({ type: "png" });
      const file = new URL(`${name}-${theme}.webp`, OUT);
      await sharp(png).resize(viewport.width * (viewport.isMobile ? 2 : 1)).webp({ quality: 82 }).toFile(file.pathname);
      console.log(file.pathname);
    }
  };

  await login("menuisier");
  const proQuote = await firstId("/api/quotes");
  if (!proQuote) throw new Error("aucun devis pour le menuisier de démonstration");
  await shoot("pro-dashboard", "/tableau-de-bord", DESKTOP);
  await shoot("pro-quote", `/devis/${proQuote}`, DESKTOP);

  await login("client");
  const clientQuote = await firstId("/api/client/quotes");
  if (!clientQuote) {
    console.warn("client de démonstration sans devis : captures client inchangées (envoyer un devis à ce client puis relancer)");
  } else {
    await shoot("client-quote", `/espace-client/devis/${clientQuote}`, DESKTOP);
    await shoot("client-mobile", `/espace-client/devis/${clientQuote}`, PHONE);
  }
} finally {
  await browser.close();
}
