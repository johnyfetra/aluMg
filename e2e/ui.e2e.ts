// Test de bout en bout dans un vrai navigateur (Chrome installé). Nécessite `npm run dev`.
//   CHROME_PATH=/chemin/vers/chrome npm run test:e2e     (défaut : Chrome de macOS)
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const RUN = Date.now().toString(36);
const PASSWORD = "Atelier-Alu-2026"; // doit passer la politique de mot de passe
let PHONE_N = 0;
const phone = () => `034 ${String(10 + (++PHONE_N % 80))} ${String(100 + Math.floor(Math.random() * 899))} ${String(10 + Math.floor(Math.random() * 89))}`;

let browser: Browser;
beforeAll(async () => {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
}, 60_000);
afterAll(() => browser?.close());

async function newPage(width = 1300, height = 900): Promise<Page> {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.evaluateOnNewDocument(() => {
    if (!localStorage.getItem("alumg.locale")) localStorage.setItem("alumg.locale", "fr"); // langue de départ ; un choix ultérieur est conservé
  });
  return page;
}
const text = (page: Page) => page.evaluate(() => document.body.innerText);
const waitText = (page: Page, needle: string, timeout = 15_000) => page.waitForFunction((n) => document.body.innerText.includes(n), { timeout }, needle);
const click = async (page: Page, selector: string, label: string) => {
  await page.waitForFunction((s, l) => [...document.querySelectorAll(s)].some((e) => (e.textContent ?? "").trim().includes(l)), {}, selector, label);
  await page.evaluate((s, l) => ([...document.querySelectorAll(s)].find((e) => (e.textContent ?? "").trim().includes(l)) as HTMLElement).click(), selector, label);
};

// Inscription par le formulaire, puis vérification du compte par SMS via l'écran dédié (le serveur de test affiche le code « dev »).
async function signup(page: Page, role: "client" | "menuisier", name: string, email: string) {
  await page.goto(`${BASE}/inscription`, { waitUntil: "networkidle0" });
  await click(page, "label", role === "client" ? "Je suis client" : "Je suis menuisier");
  await page.type("#name", name);
  await page.type("#email", email);
  await page.type("#phone", phone());
  await page.type("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForFunction(() => location.pathname === "/verification", { timeout: 20_000 });
  await verifyOnScreen(page);
}

async function verifyOnScreen(page: Page) {
  await click(page, "button", "Envoyer le code");
  await waitText(page, "Mode test : votre code est");
  const code = (await text(page)).match(/votre code est\s*(\d{6})/)![1];
  await page.click('input[aria-label^="Saisissez le code à 6 chiffres 1"]');
  await page.keyboard.type(code, { delay: 20 });
  await page.waitForFunction(() => location.pathname !== "/verification", { timeout: 20_000 });
}

// Menuisier publié créé par l'API (pour que le client ait quelqu'un à qui demander un devis).
async function publishedJoiner() {
  const res = await fetch(`${BASE}/api/auth/signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "menuisier", name: `Atelier UI ${RUN}`, email: `ui-pro-${RUN}@ex.mg`, phone: phone(), password: PASSWORD }) });
  const cookie = res.headers.getSetCookie()[0].split(";")[0];
  const h = { "Content-Type": "application/json", Cookie: cookie };
  const sent = await (await fetch(`${BASE}/api/auth/verify/send`, { method: "POST", headers: h, body: JSON.stringify({ channel: "sms" }) })).json();
  await fetch(`${BASE}/api/auth/verify/confirm`, { method: "POST", headers: h, body: JSON.stringify({ code: sent.devCode }) });
  const prof = await (await fetch(`${BASE}/api/profile`, { headers: h })).json();
  await fetch(`${BASE}/api/profile`, { method: "PUT", headers: h, body: JSON.stringify({ displayName: `Atelier UI ${RUN}`, slug: prof.slug, city: "Nosy Be", bio: "Test", specialties: ["portes"], logo: "", published: true }) });
  return { slug: prof.slug as string, name: `Atelier UI ${RUN}` };
}

describe("parcours dans le navigateur", () => {
  let joiner: { slug: string; name: string };
  beforeAll(async () => {
    joiner = await publishedJoiner();
  });

  it("un visiteur consulte l'annuaire et un profil sans compte ; demander un devis renvoie vers la connexion", async () => {
    const page = await newPage();
    await page.goto(`${BASE}/menuisiers`, { waitUntil: "networkidle0" });
    await waitText(page, joiner.name);
    await page.goto(`${BASE}/menuisiers/${joiner.slug}`, { waitUntil: "networkidle0" });
    await waitText(page, "Demander un devis");
    expect(await text(page)).toContain("Nosy Be");
    await click(page, "a", "Se connecter pour demander un devis");
    await page.waitForFunction(() => location.pathname === "/connexion");
    expect(decodeURIComponent(page.url())).toContain(`next=/espace-client/nouvelle?menuisier=${joiner.slug}`);
    await page.close();
  }, 60_000);

  it("un client s'inscrit, est gardé hors de l'espace menuisier, et envoie une demande de devis", async () => {
    const page = await newPage();
    await signup(page, "client", "Client UI", `ui-client-${RUN}@ex.mg`);
    await page.waitForFunction(() => location.pathname === "/espace-client", { timeout: 20_000 });
    await waitText(page, "Bonjour, Client UI");

    await page.goto(`${BASE}/tableau-de-bord`, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => location.pathname === "/espace-client", { timeout: 15_000 }); // renvoyé vers son espace

    await page.goto(`${BASE}/espace-client/nouvelle?menuisier=${joiner.slug}`, { waitUntil: "networkidle0" });
    await page.waitForSelector("#rq-p");
    await page.type("#rq-p", "Maison test");
    await page.type("#rq-msg", "Deux fenêtres svp");
    await click(page, "button", "Envoyer ma demande");
    await page.waitForFunction(() => location.pathname.startsWith("/espace-client/devis/"), { timeout: 20_000 });
    await waitText(page, "En attente du devis");
    expect(await text(page)).toContain("Maison test");
    await page.close();
  }, 90_000);

  it("un menuisier s'inscrit, publie son profil, puis apparaît dans l'annuaire", async () => {
    const page = await newPage();
    const name = `Pro UI ${RUN}`;
    await signup(page, "menuisier", name, `ui-pro2-${RUN}@ex.mg`);
    await page.waitForFunction(() => location.pathname === "/tableau-de-bord", { timeout: 20_000 });

    await page.goto(`${BASE}/profil-public`, { waitUntil: "networkidle0" });
    await page.waitForSelector("#pp-city");
    await page.type("#pp-city", "Antsirabe");
    await page.click("input[role=switch]");
    await click(page, "button[type=submit]", "Enregistrer");
    await waitText(page, "Profil enregistré.");

    await page.goto(`${BASE}/menuisiers?city=antsirabe`, { waitUntil: "networkidle0" });
    await page.type("input[type=search]", name);
    await waitText(page, name);
    await page.close();
  }, 90_000);

  it("messagerie : le client écrit depuis le profil, le menuisier voit la pastille et répond", async () => {
    const cEmail = `ui-chat-${RUN}@ex.mg`;
    const cp = await newPage();
    await signup(cp, "client", "Client Chat", cEmail);
    await cp.waitForFunction(() => location.pathname === "/espace-client", { timeout: 20_000 });
    await cp.goto(`${BASE}/menuisiers/${joiner.slug}`, { waitUntil: "networkidle0" });
    await click(cp, "button", "Envoyer un message");
    await cp.waitForFunction(() => location.pathname === "/messages", { timeout: 20_000 });
    await cp.waitForSelector("textarea[id^=chat-input]");
    await cp.type("textarea[id^=chat-input]", "Bonjour, disponible en décembre ?");
    await cp.keyboard.press("Enter");
    await waitText(cp, "Bonjour, disponible en décembre ?");

    const mp = await newPage();
    await mp.goto(`${BASE}/connexion`, { waitUntil: "networkidle0" });
    await mp.type("#identifier", `ui-pro-${RUN}@ex.mg`);
    await mp.type("#password", PASSWORD);
    await mp.click("button[type=submit]");
    await mp.waitForFunction(() => location.pathname === "/tableau-de-bord", { timeout: 20_000 });
    await mp.waitForSelector('a[href="/messages"] span[aria-label]', { timeout: 20_000 }); // pastille de non-lus
    await mp.goto(`${BASE}/messages`, { waitUntil: "networkidle0" });
    await click(mp, "button", "Client Chat");
    await waitText(mp, "Bonjour, disponible en décembre ?");
    await mp.type("textarea[id^=chat-input]", "Oui, le 10 décembre.");
    await mp.keyboard.press("Enter");
    await cp.bringToFront(); // SWR ne relance pas les requêtes d'un onglet masqué
    await waitText(cp, "Oui, le 10 décembre.", 20_000); // le client reçoit la réponse (interrogation régulière)
    await cp.close();
    await mp.close();
  }, 90_000);

  it("langue et thème : changent à l'écran et sont mémorisés", async () => {
    const page = await newPage();
    await page.goto(`${BASE}/menuisiers`, { waitUntil: "networkidle0" });
    await click(page, "button[aria-haspopup=menu]", "Français");
    await click(page, "[role=menuitemradio]", "English");
    await waitText(page, "Aluminium joiners rated by their own clients");
    expect(await page.evaluate(() => document.documentElement.lang)).toBe("en");
    await page.click('button[aria-label="Dark"]');
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
    await page.reload({ waitUntil: "networkidle0" });
    expect(await page.evaluate(() => [document.documentElement.lang, document.documentElement.dataset.theme])).toEqual(["en", "dark"]);
    await page.close();
  }, 60_000);

  it("mobile : pas de défilement horizontal sur les pages publiques", async () => {
    const page = await newPage(390, 800);
    for (const path of ["/", "/menuisiers", `/menuisiers/${joiner.slug}`, "/connexion", "/inscription"]) {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" });
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, path).toBeLessThanOrEqual(1);
    }
    await page.close();
  }, 60_000);
});
