/**
 * Données de démonstration réalistes : 6 menuisiers (logo, photo de profil, réalisations, avis), 4 clients, des devis à tous les stades.
 * Nécessite `npm run dev` et les images (node scripts/make-demo-assets.mjs). Idempotent : peut être relancé.
 *   npm run seed:demo
 *   ADMIN_EMAIL=admin@alumg.local ADMIN_PASSWORD=… npm run seed:demo     (pour accorder le badge « Vérifié »)
 * Tous les comptes ont le mot de passe « motdepasse123 ».
 */
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { CLIENTS, MENUISIERS, PASSWORD } from "./demo-data.mjs";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
class Api {
  cookie = "";
  async call(method, path, body) {
    const res = await fetch(BASE + path, { method, redirect: "manual", headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
    const sc = res.headers.getSetCookie().find((c) => c.startsWith("alumg_session="));
    if (sc) this.cookie = /Max-Age=0|1970/i.test(sc) ? "" : sc.split(";")[0];
    return { status: res.status, body: (res.headers.get("content-type") ?? "").includes("json") ? await res.json() : null };
  }
  async must(method, path, body) {
    const r = await this.call(method, path, body);
    if (r.status >= 300) throw new Error(`${method} ${path} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
    return r.body;
  }
}
const dataUrl = (buf, mime) => `data:${mime};base64,${buf.toString("base64")}`;
const png = async (file, size) => dataUrl(await sharp(readFileSync(file)).resize(size, size).png({ compressionLevel: 9 }).toBuffer(), "image/png");
const jpg = async (file, size) => dataUrl(await sharp(readFileSync(file)).resize(size, size).flatten({ background: "#fff" }).jpeg({ quality: 85 }).toBuffer(), "image/jpeg");
const file = (f) => dataUrl(readFileSync(f), "image/jpeg");

async function account(a, role, name, email, phone) {
  const s = await a.call("POST", "/api/auth/signup", { role, name, email, phone, password: PASSWORD });
  if (s.status === 409) await a.must("POST", "/api/auth/login", { email, password: PASSWORD });
  else if (s.status >= 300) throw new Error(`signup ${email}: ${s.status} ${JSON.stringify(s.body)}`);
}

// ---------- menuisiers ----------
const slugs = {};
const pros = {};
for (const m of MENUISIERS) {
  const a = new Api();
  await account(a, "menuisier", m.name, m.email, m.phone);
  await a.must("PATCH", "/api/me", { name: m.name, avatar: await jpg(`public/demo/avatars/${m.avatar}.svg`, 256) });
  const logo = await png(`public/demo/logos/${m.logo}.svg`, 240);
  const st = await a.must("GET", "/api/settings");
  await a.must("PUT", "/api/settings", { ...st, company: m.display, address: `${m.city}, Madagascar`, phone: m.phone, email: m.email, website: "", nif: "400" + Math.floor(1e6 + Math.random() * 9e6), stat: "", logo, signer: m.name, paymentInfo: "MVola " + m.phone });
  const prof = await a.must("GET", "/api/profile");
  await a.must("PUT", "/api/profile", { displayName: m.display, slug: prof.slug, city: m.city, bio: m.bio, specialties: m.specialties, logo, published: true });
  slugs[m.email] = prof.slug;
  pros[m.email] = a;
  for (const it of await a.must("GET", "/api/portfolio")) await a.must("DELETE", `/api/portfolio/${it.id}`);
  for (const w of m.works) {
    await a.must("POST", "/api/portfolio", { title: w.title, description: w.text, category: w.category, year: w.year, images: [1, 2, 3].map((i) => file(`public/demo/work/${w.scene}-${i}.jpg`)), thumb: file(`public/demo/work/${w.scene}-thumb.jpg`) });
  }
  console.log("menuisier", m.display, "→", prof.slug);
}

// ---------- badge « Vérifié » (administrateur) ----------
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  const adm = new Api();
  await adm.must("POST", "/api/auth/login", { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  for (const m of MENUISIERS) await adm.must("PATCH", `/api/admin/menuisiers/${slugs[m.email]}`, { verified: m.verified });
  console.log("badges vérifiés accordés");
} else console.log("(pas de badge « Vérifié » : définissez ADMIN_EMAIL et ADMIN_PASSWORD)");

// ---------- clients et devis à tous les stades ----------
const clients = {};
for (const c of CLIENTS) {
  const a = new Api();
  await account(a, "client", c.name, c.email, c.phone);
  await a.must("PATCH", "/api/me", { avatar: await jpg(`public/demo/avatars/${c.avatar}.svg`, 256) });
  clients[c.email] = a;
}
const line = (o) => ({ id: crypto.randomUUID(), category: "fenetre", opening: "coulissant", leaves: 2, shutter: "roulant", control: "manuel", guard: "verre", range: "asiatique", finish: "blanc", infill: "vitree", glassType: "clair", thickness: "5", pattern: "none", extras: [], width: 1500, height: 1200, qty: 2, unit: 0, ...o });
const SETS = [
  [line({}), line({ category: "porte", opening: "ouvrant", leaves: 2, infill: "semi", width: 1400, height: 2100, qty: 1, finish: "anthracite" })],
  [line({ leaves: 3, width: 2400, finish: "anthracite", qty: 1 }), line({ category: "volet", control: "motorise", width: 2400, height: 2000, qty: 1, finish: "anthracite" })],
  [line({ opening: "ouvrant", leaves: 2, width: 1300, finish: "chene-dore", range: "europeen", qty: 4 })],
  [line({ category: "garde-corps", guard: "verre", width: 3000, height: 1000, finish: "naturel", thickness: "10", qty: 1, glassType: "feuillete" })],
  [line({ category: "cloison", leaves: 4, width: 3400, height: 2400, finish: "noir", qty: 1 })],
];
const COMMENTS = {
  5: ["Travail impeccable, pose rapide et équipe très professionnelle. Je recommande sans hésiter.", "Devis clair, délais respectés et finition soignée. Très satisfaite du résultat.", "Excellent rapport qualité-prix. L'équipe a protégé le chantier et tout nettoyé en partant."],
  4: ["Très bon travail, un léger retard sur la livraison mais le résultat est au rendez-vous.", "Bon professionnel, à l'écoute. Petite retouche faite rapidement après la pose."],
};
const pick = (r, i) => COMMENTS[r][i % COMMENTS[r].length];
const SCENARIOS = [
  ["noro@client.mg", "tana@demo.mg", 0, "done", 5], ["toky@client.mg", "tana@demo.mg", 2, "done", 4], ["lalao@client.mg", "tana@demo.mg", 1, "done", 5],
  ["hery@client.mg", "sud@alumada.mg", 4, "done", 4], ["noro@client.mg", "sud@alumada.mg", 0, "done", 5],
  ["toky@client.mg", "mahajanga@demo.mg", 3, "done", 5], ["lalao@client.mg", "mahajanga@demo.mg", 0, "done", 4], ["noro@client.mg", "mahajanga@demo.mg", 1, "done", 5],
  ["hery@client.mg", "nosybe@demo.mg", 3, "done", 4], ["lalao@client.mg", "fianar@demo.mg", 1, "done", 5],
  ["noro@client.mg", "test@alumada.mg", 1, "done", 5], ["toky@client.mg", "test@alumada.mg", 0, "done", 4],
  ["lalao@client.mg", "test@alumada.mg", 2, "running", 60], ["hery@client.mg", "test@alumada.mg", 3, "requested", 0], ["toky@client.mg", "test@alumada.mg", 4, "sent", 0],
];
let created = 0;
for (const [i, [ce, me, set, kind, extra]] of SCENARIOS.entries()) {
  const c = clients[ce];
  const m = pros[me];
  const project = `Démo ${i + 1} — ${MENUISIERS.find((x) => x.email === me).display}`;
  const mine = await c.must("GET", "/api/client/quotes");
  if (mine.some((x) => x.quote.project === project)) continue;
  const q = await c.must("POST", "/api/requests", { menuisier: slugs[me], project, message: "Bonjour, je souhaite un devis pour ces ouvrages. Merci de me contacter pour fixer un rendez-vous.", siteAddress: "Antananarivo", wantedDate: "", lines: SETS[set] });
  const act = (who, body) => who.must("POST", `/api/quotes/${q.id}/actions`, body);
  if (kind !== "requested") await act(m, { type: "send", message: "Bonjour, voici mon devis détaillé. Je reste disponible pour toute question." });
  if (kind === "done" || kind === "running") {
    await act(c, { type: "accept" });
    await act(m, { type: "progress", progress: kind === "running" ? extra : 40, message: "Fabrication lancée, profilés coupés et vitrage commandé." });
    if (kind === "done") {
      await act(m, { type: "progress", progress: 100, message: "Pose terminée, merci pour votre confiance !" });
      await act(c, { type: "review", rating: extra, comment: pick(extra, i) });
    }
  }
  created++;
}
console.log(`devis de démonstration créés : ${created}`);
console.log("Comptes (mot de passe « " + PASSWORD + " ») : " + [...MENUISIERS.map((m) => m.email), ...CLIENTS.map((c) => c.email)].join(", "));
