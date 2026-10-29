/**
 * Données de test réalistes pour le compte menuisier de démonstration (test@alumada.mg, « Alu Mada ») et ses clients :
 * une vingtaine de devis à tous les stades (brouillon, demande, envoyé, négociation, révisé, accepté, en cours, terminé et évalué, refusé avec motif,
 * validité dépassée), des ouvrages variés, des prestations avec leur coût, des commentaires par ouvrage et des conversations.
 * Tout passe par l'API réelle (aucune écriture directe) ; scripts/backdate-demo.ts étale ensuite les dates pour un historique crédible.
 * Prérequis : `npm run seed:demo` (comptes), serveur local `npm run dev:local`. Lancer tout d'un coup : `npm run seed:local`.
 */
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { account, Api } from "./demo-api.mjs";
import { CLIENTS, MENUISIERS } from "./demo-data.mjs";
import { normalize } from "../lib/calc";
import { salePrice } from "../lib/costing";
import { type Line, type Quote, type Service, type Settings, type Status, lineSchema, quoteSchema, withDefaults } from "../lib/model";

const PRO = MENUISIERS.find((m) => m.email === "test@alumada.mg")!;
const day = 864e5;

// ---------- compte menuisier : réglages réalistes (prix datés, main-d'œuvre, marge) ----------
const pro = new Api();
await account(pro, "menuisier", PRO.name, PRO.email, PRO.phone);
const st = await pro.must("GET", "/api/settings");
const offers = Object.fromEntries(
  Object.entries<{ length: number; price: number }[]>(st.market.offers).map(([k, list], i) => [k, list.map((o) => ({ ...o, price: Math.round((o.price * (0.94 + ((i * 7) % 13) / 50)) / 500) * 500 }))]),
);
const market = { ...st.market, offers, supplier: "Alu Import Tana", priceDate: new Date(Date.now() - 12 * day).toISOString().slice(0, 10), panel: 95000, glassWaste: 10 };
const settings: Settings = withDefaults(
  await pro.must("PUT", "/api/settings", {
    ...st, pricing: "cost", marginPct: 32, overheadPct: 14, minMarginPct: 15, tva: 20, deposit: 50, validityDays: 30, market,
    labor: { rate: 6000, fixedMin: 40, cutMin: 1.5, leafMin: 50, glazingMin: 25 },
    paymentInfo: "Acompte de 50 % à la commande, solde à la livraison. MVola 034 12 345 67 ou virement BNI.",
  }),
);
const slug = (await pro.must("GET", "/api/profile")).slug as string;
if ((await pro.must("GET", "/api/quotes")).some((q: Quote) => q.project.includes("Ankorondrano"))) {
  console.log("Les devis réalistes existent déjà : rien à faire (supprimez .data/pglite pour repartir de zéro).");
  process.exit(0);
}

// ---------- clients ----------
const clients: Record<string, { api: Api; id: string; name: string; phone: string; email: string }> = {};
for (const c of CLIENTS) {
  const api = new Api();
  await account(api, "client", c.name, c.email, c.phone);
  clients[c.email.split("@")[0]] = { api, id: (await api.must("GET", "/api/me")).id, name: c.name, phone: c.phone, email: c.email };
}

// ---------- ouvrages ----------
type Spec = Partial<Line> & { room: string };
const BASE = { category: "fenetre", opening: "coulissant", leaves: 2, shutter: "roulant", control: "manuel", guard: "verre", range: "asiatique", finish: "blanc", infill: "vitree", glassType: "clair", thickness: "5", pattern: "none", extras: [], width: 1500, height: 1200, qty: 1, unit: 0 };
const ln = (s: Spec): Line => {
  const l = normalize(lineSchema.parse({ id: randomUUID(), ...BASE, ...s }));
  return { ...l, unit: salePrice(l, settings) };
};
const baie = (o: Partial<Spec> = {}) => ln({ room: "Salon", leaves: 3, width: 2400, height: 1300, finish: "anthracite", thickness: "6", note: "Vitrage clair 6 mm, rail encastré.", ...o });
const chambres = (o: Partial<Spec> = {}) => ln({ room: "Chambres", qty: 3, extras: ["moustiquaire"], ...o });
const porteEntree = (o: Partial<Spec> = {}) => ln({ room: "Entrée", category: "porte", opening: "ouvrant", leaves: 2, infill: "semi", width: 1400, height: 2100, finish: "anthracite", ...o });
const naco = (o: Partial<Spec> = {}) => ln({ room: "Salle de bain", opening: "jalousie", leaves: 1, width: 700, height: 1000, finish: "champagne", glassType: "depoli", ...o });
const oscillo = (o: Partial<Spec> = {}) => ln({ room: "Cuisine", opening: "oscillo", leaves: 1, width: 1100, height: 1400, finish: "noir", ...o });
const voletMotor = (o: Partial<Spec> = {}) => ln({ room: "Salon", category: "volet", control: "motorise", box: "encastre", slat: "42", width: 2400, height: 2000, finish: "anthracite", ...o });
const volets = (o: Partial<Spec> = {}) => ln({ room: "Chambres", category: "volet", width: 1500, height: 1400, qty: 3, ...o });
const gardeVerre = (o: Partial<Spec> = {}) => ln({ room: "Terrasse", category: "garde-corps", guard: "verre", width: 3000, height: 1000, finish: "naturel", thickness: "10", glassType: "feuillete", ...o });
const gardeBarreaux = (o: Partial<Spec> = {}) => ln({ room: "Escalier", category: "garde-corps", guard: "barreaudage", width: 2600, height: 1000, finish: "noir", ...o });
const cloison = (o: Partial<Spec> = {}) => ln({ room: "Bureau", category: "cloison", leaves: 4, width: 3400, height: 2400, finish: "noir", ...o });
const porteCoul = (o: Partial<Spec> = {}) => ln({ room: "Véranda", category: "porte", opening: "coulissant", leaves: 2, width: 2200, height: 2100, finish: "bronze", ...o });
const fixe = (o: Partial<Spec> = {}) => ln({ room: "Escalier", opening: "fixe", leaves: 1, width: 1200, height: 1800, finish: "chene-dore", glassType: "teinte-bronze", ...o });
const rideau = (o: Partial<Spec> = {}) => ln({ room: "Garage", category: "volet", shutter: "rideau", width: 3000, height: 2500, finish: "anthracite", ...o });

const svc = (kind: Service["kind"], label: string, qty: number, price: number, cost: number): Service => ({ id: randomUUID(), kind, label, qty, price, cost });
const pose = (n: number, unit = 120000, cost = 80000) => svc("pose", "Pose et finitions (équipe de 2)", n, unit, cost);
const transport = (price = 60000, cost = 40000) => svc("deplacement", "Transport des ouvrages", 1, price, cost);
const depose = (n: number) => svc("depose", "Dépose des anciennes menuiseries", n, 45000, 28000);

// ---------- scénarios ----------
type Step =
  | ["send", string?]
  | ["change", number, string]
  | ["revise", { discount?: number; note?: string }]
  | ["accept", string?]
  | ["reject", Quote["lostReason"], string?]
  | ["progress", number, string?]
  | ["review", number, string]
  | ["cm", "c" | "m", number, string]
  | ["status", Status];
type Scenario = {
  client: string; // clé de `clients`, ou fiche d'un client sans compte
  walkin?: { name: string; phone: string; email: string };
  via: "pro" | "request";
  age: number; // jours depuis la création du devis
  last: number; // jours depuis la dernière activité
  project: string; address: string; delay: string; notes: string; warranty?: number; discount?: number;
  request?: string; // message du client (demande)
  lines: Line[]; services?: Service[]; steps: Step[];
};

const SCENARIOS: Scenario[] = [
  { client: "lalao", via: "request", age: 96, last: 70, project: "Fenêtres et porte coulissante — Ankorondrano", address: "Lot II B 45, Ankorondrano", delay: "3 semaines après acompte", notes: "Pose en rénovation sur dormants existants.", warranty: 24,
    request: "Bonjour, je souhaite remplacer les fenêtres du séjour et mettre une porte coulissante sur la terrasse. Pouvez-vous passer faire le métré ?",
    lines: [baie({ room: "Séjour" }), porteCoul({ room: "Terrasse" }), chambres({ qty: 2, room: "Chambres" })], services: [depose(5), pose(5), transport()],
    steps: [["send", "Bonjour Mme Lalao, voici le devis après notre visite de mardi. Les dimensions sont celles relevées sur place."], ["cm", "c", 1, "La porte peut-elle être en bronze comme les cadres du portail ?"], ["cm", "m", 1, "Oui, c'est déjà prévu en bronze, finition thermolaquée."], ["accept", "C'est d'accord, merci pour la visite."], ["progress", 40, "Profilés coupés, vitrage commandé."], ["progress", 100, "Pose terminée et chantier nettoyé."], ["review", 5, "Équipe ponctuelle et très propre, la porte coulisse parfaitement. Je recommande."]] },
  { client: "noro", via: "pro", age: 78, last: 41, project: "Rénovation façade — Ivandry", address: "Rue des Jacarandas, Ivandry", delay: "4 semaines", notes: "Livraison et pose par notre équipe. Évacuation des gravats incluse.", warranty: 24, discount: 5,
    lines: [baie({ room: "Séjour", width: 2800 }), chambres({ qty: 3 }), porteEntree(), oscillo(), naco()], services: [depose(7), pose(7), transport(80000, 55000)],
    steps: [["send", "Bonjour, voici le devis complet de votre façade, avec 5 % de remise commerciale."], ["accept", "Parfait, nous validons."], ["progress", 30, "Commande des profilés anthracite passée."], ["progress", 70, "Fabrication terminée, livraison prévue la semaine prochaine."], ["progress", 100, "Pose terminée."], ["review", 5, "Très belle finition, délais respectés. Merci à toute l'équipe."]] },
  { client: "toky", via: "request", age: 63, last: 22, project: "Villa Ambatobe — fenêtres, volets et terrasse", address: "Ambatobe, route du lycée", delay: "6 semaines", notes: "Volets roulants motorisés avec télécommande. Garde-corps verre feuilleté en terrasse.", warranty: 36, discount: 5,
    request: "Nous construisons une villa à Ambatobe. Nous voulons des fenêtres coulissantes, des volets motorisés et un garde-corps en verre pour la terrasse du premier étage.",
    lines: [baie({ room: "Séjour", width: 3200, leaves: 4, finish: "champagne" }), chambres({ qty: 4, finish: "champagne" }), voletMotor({ finish: "champagne" }), volets({ qty: 4, finish: "champagne", control: "motorise" }), gardeVerre()], services: [pose(14, 150000, 100000), transport(150000, 100000)],
    steps: [["send", "Bonjour, voici notre proposition pour la villa. Remise de 5 % car le chantier est important."], ["change", 8, "Pourriez-vous aller à 8 % de remise si nous prenons aussi le garde-corps ?"], ["revise", { discount: 7, note: "Remise portée à 7 % (garde-corps inclus)." }], ["send", "Je peux faire 7 % maximum, c'est notre limite sur le verre feuilleté."], ["accept", "Très bien, nous acceptons à 7 %."], ["progress", 50, "Volets motorisés commandés, profilés en cours de coupe."], ["progress", 100, "Livraison et pose terminées, télécommandes programmées."], ["review", 4, "Très bon travail. Petit retard d'une semaine mais la qualité est là."]] },
  { client: "noro", via: "request", age: 55, last: 49, project: "Garde-corps terrasse — Ivandry", address: "Rue des Jacarandas, Ivandry", delay: "2 semaines", notes: "Verre feuilleté 10 mm.",
    request: "Je voudrais un garde-corps en verre pour ma terrasse (environ 3 m).", lines: [gardeVerre()], services: [pose(1, 180000, 120000), transport(40000, 28000)],
    steps: [["send", "Voici le devis du garde-corps en verre feuilleté, pose comprise."], ["reject", "price", "Trop cher pour le moment, j'ai eu un devis moins élevé pour un garde-corps inox."]] },
  { client: "toky", via: "pro", age: 41, last: 33, project: "Garage et portail — Ankadifotsy", address: "Ankadifotsy", delay: "10 jours", notes: "Rideau métallique anthracite, manuel.",
    lines: [rideau(), gardeBarreaux({ room: "Portillon", width: 1400 })], services: [pose(2, 130000, 90000)],
    steps: [["send"], ["reject", "competitor", "Nous avons choisi un artisan de notre quartier, merci quand même."]] },
  { client: "lalao", via: "request", age: 34, last: 3, project: "Extension salon — Ankorondrano", address: "Lot II B 45, Ankorondrano", delay: "5 semaines", notes: "Acompte de 50 % à la commande. Fabrication sur mesure après métré final.", warranty: 24,
    request: "Nous agrandissons le salon : une grande baie, une porte coulissante et deux fenêtres. Pouvez-vous nous faire un devis ?",
    lines: [baie({ room: "Salon", width: 3200, leaves: 4 }), porteCoul({ room: "Jardin" }), fixe({ room: "Escalier", width: 1000 }), chambres({ qty: 2, room: "Bureaux" })], services: [pose(8), transport()],
    steps: [["send", "Bonjour, voici le devis de l'extension."], ["cm", "c", 0, "La baie peut-elle avoir un vitrage légèrement teinté contre la chaleur de l'après-midi ?"], ["cm", "m", 0, "Oui, un teinté gris est possible, supplément de 95 000 Ar/m². Je vous l'ajoute ?"], ["cm", "c", 0, "Oui, merci. Et pour la porte, quelle sera la couleur du rail ?"], ["accept", "Nous acceptons le devis avec le vitrage teinté."], ["progress", 20, "Commande des profilés."], ["progress", 60, "Fabrication de la baie en cours, vitrage reçu ce matin."]] },
  { client: "hery", via: "pro", age: 29, last: 24, project: "Chambres et salle de bain — 67 ha", address: "67 ha Nord-Est", delay: "3 semaines", notes: "",
    lines: [chambres({ qty: 2 }), naco({ qty: 2 })], services: [pose(4)],
    steps: [["send"], ["reject", "delay", "Il me faut la pose avant la fin du mois, vous ne pouvez pas."]] },
  { client: "noro", via: "pro", age: 44, last: 44, project: "Cloison de bureau — Analakely", address: "Immeuble Le Colbert, Analakely", delay: "2 semaines", notes: "Cloison vitrée noire, porte battante intégrée.",
    lines: [cloison(), porteEntree({ room: "Bureau", leaves: 1, width: 900, infill: "vitree", finish: "noir" })], services: [pose(2, 140000, 95000)],
    steps: [["send", "Voici le devis de la cloison de bureau, valable 30 jours."]] },
  { client: "hery", via: "request", age: 20, last: 1, project: "Maison familiale — Antsirabe", address: "Antsirabe, quartier Ambohimena", delay: "5 semaines", notes: "Livraison à Antsirabe comprise.", warranty: 24,
    request: "Nous construisons à Antsirabe, j'ai besoin de fenêtres et de volets pour toute la maison. Est-ce que vous livrez ?",
    lines: [chambres({ qty: 5 }), baie({ room: "Salon", width: 2000, leaves: 2 }), volets({ qty: 5 }), porteEntree()], services: [pose(12, 110000, 75000), transport(220000, 160000)],
    steps: [["send", "Oui nous livrons à Antsirabe, voici le détail."], ["change", 0, "Pouvez-vous mettre la porte d'entrée en chêne doré (faux bois) plutôt qu'anthracite ?"], ["revise", { note: "Porte d'entrée en chêne doré, supplément faux bois inclus." }], ["send", "C'est modifié, la porte est maintenant en chêne doré."], ["accept"], ["progress", 25, "Commande passée chez le fournisseur."]] },
  { client: "hery", via: "pro", age: 27, last: 27, project: "Clôture vitrée de terrasse — 67 ha", address: "67 ha Nord-Est", delay: "2 semaines", notes: "Garde-corps verre et portillon.",
    lines: [gardeVerre({ width: 4200 }), gardeBarreaux({ room: "Portillon", width: 1000 })], services: [pose(2, 160000, 110000)],
    steps: [["send", "Voici le devis pour votre terrasse. Il reste valable jusqu'à la fin du mois."]] },
  { client: "toky", via: "request", age: 17, last: 2, project: "Boutique — Analakely", address: "Analakely, rue Rainandriamampandry", delay: "3 semaines", notes: "Vitrine fixe 2 panneaux + porte coulissante.",
    request: "Je rénove ma boutique, il me faut une grande vitrine et une porte coulissante vitrée.",
    lines: [fixe({ room: "Vitrine", width: 2200, height: 2000, glassType: "clair" }), fixe({ room: "Vitrine", width: 2200, height: 2000, glassType: "clair" }), porteCoul({ room: "Entrée", width: 2000, finish: "naturel" })], services: [pose(3, 140000, 95000)],
    steps: [["send", "Voici le devis pour la boutique."], ["change", 8, "C'est un peu au-dessus de mon budget, pouvez-vous faire un effort de 8 % ?"]] },
  { client: "lalao", via: "pro", age: 15, last: 9, project: "Volets roulants — Ankorondrano", address: "Lot II B 45, Ankorondrano", delay: "2 semaines", notes: "Motorisation Somfy-compatible.", warranty: 24,
    lines: [voletMotor({ room: "Séjour", width: 3200, height: 2100 }), volets({ qty: 3, room: "Chambres", control: "motorise" })], services: [pose(4), transport(40000, 28000)],
    steps: [["send", "Voici le devis des volets roulants motorisés."], ["reject", "changed_mind", "Nous reportons le projet, les volets viendront plus tard."]] },
  { client: "noro", via: "request", age: 3, last: 3, project: "Volets roulants — Ivandry", address: "Rue des Jacarandas, Ivandry", delay: "2 semaines", notes: "Volets manuels, coffre apparent.",
    request: "Bonjour, je voudrais des volets roulants pour 4 fenêtres de l'étage.", lines: [volets({ qty: 4, room: "Étage", width: 1400, height: 1300 })], services: [pose(4, 100000, 70000)],
    steps: [["send", "Bonjour, voici le devis des 4 volets roulants manuels."]] },
  { client: "hery", via: "request", age: 2, last: 2, project: "Fenêtre chambre bébé — 67 ha", address: "67 ha Nord-Est", delay: "", notes: "",
    request: "Je voudrais une fenêtre oscillo-battante avec moustiquaire pour la chambre du bébé, plutôt en blanc.", lines: [oscillo({ room: "Chambre bébé", finish: "blanc", extras: ["moustiquaire"], width: 1000, height: 1300 })], steps: [] },
  { client: "toky", via: "request", age: 0, last: 0, project: "Remplacement urgent — Ambatobe", address: "Ambatobe", delay: "", notes: "",
    request: "Une fenêtre a été cassée par la tempête, il me faut un remplacement le plus vite possible. Dimensions environ 1,2 m × 1,1 m.", lines: [ln({ room: "Chambre 2", width: 1200, height: 1100 })], steps: [] },
  { client: "lalao", via: "pro", age: 1, last: 1, project: "Garde-corps escalier — Ankorondrano", address: "Lot II B 45, Ankorondrano", delay: "10 jours", notes: "Brouillon en préparation, à envoyer après le métré.",
    lines: [gardeBarreaux({ width: 3400, finish: "anthracite" })], services: [pose(1, 130000, 90000)], steps: [] },
  { client: "walkin", walkin: { name: "M. Rakotondrabe Jean", phone: "033 11 456 20", email: "" }, via: "pro", age: 4, last: 4, project: "Fenêtres de la boutique — Analakely", address: "Analakely, 1er étage", delay: "2 semaines", notes: "Client rencontré en boutique, pas de compte AluMg.",
    lines: [chambres({ room: "Boutique", qty: 4 }), porteEntree({ room: "Boutique", leaves: 1, width: 900 })], services: [pose(5)], steps: [] },
  { client: "walkin", walkin: { name: "Café Le Vazaha", phone: "034 77 120 33", email: "" }, via: "pro", age: 52, last: 38, project: "Façade du café — Isoraka", address: "Isoraka, rue Ratsimilaho", delay: "3 semaines", notes: "Devis accepté sur place, suivi hors application.", warranty: 12,
    lines: [fixe({ room: "Façade", width: 2400, height: 2200, finish: "noir", glassType: "clair" }), porteCoul({ room: "Terrasse", width: 2400, finish: "noir" })], services: [pose(3, 150000, 100000)], steps: [["status", "sent"], ["status", "accepted"]] },
];

// ---------- exécution ----------
const created: { id: string; age: number; last: number }[] = [];
let n = 0;
for (const sc of [...SCENARIOS].sort((a, b) => b.age - a.age)) {
  const cl = sc.walkin ?? clients[sc.client];
  const terms = { tva: settings.tva, deposit: settings.deposit, validityDays: settings.validityDays };
  let q: Quote;
  const content = { project: sc.project, delay: sc.delay, notes: sc.notes, warranty: sc.warranty, discount: sc.discount ?? 0, services: sc.services ?? [] };
  if (sc.via === "request") {
    const c = clients[sc.client];
    const r = await c.api.must("POST", "/api/requests", { menuisier: slug, project: sc.project, message: sc.request ?? "", siteAddress: sc.address, wantedDate: "", lines: sc.lines.map((l) => ({ ...l, unit: 0 })) });
    // une demande sans suite reste « requested » (l'enregistrer la passerait en préparation) ; sinon le menuisier la chiffre avec ses ouvrages et prestations
    q = sc.steps.length ? await pro.must("PUT", `/api/quotes/${r.id}`, { ...(await pro.must("GET", `/api/quotes/${r.id}`)), ...content, lines: sc.lines.map((l, i) => ({ ...l, id: r.lines[i].id })) }) : r;
  } else {
    const draft = quoteSchema.parse({ id: randomUUID(), number: "", date: "", status: "draft", client: { name: cl.name, phone: cl.phone, address: sc.address, email: cl.email }, ...content, lines: sc.lines, terms });
    q = await pro.must("POST", "/api/quotes", draft);
  }
  const id = q.id;
  const who = sc.walkin ? null : clients[sc.client];
  const rev = async () => ((await who!.api.must("GET", `/api/client/quotes/${id}`)).quote.rev ?? 0) as number;
  const act = (a: Api, body: object) => a.must("POST", `/api/quotes/${id}/actions`, body);
  for (const step of sc.steps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [kind, ...p] = step as [string, ...any[]];
    switch (kind) {
      case "send": await act(pro, { type: "send", ...(p[0] ? { message: p[0] } : {}) }); break;
      case "change": await act(who!.api, { type: "request_change", message: p[1], ...(p[0] ? { discountPercent: p[0] } : {}), rev: await rev() }); break;
      case "revise": {
        const cur: Quote = await pro.must("GET", `/api/quotes/${id}`);
        const patch = p[0] as { discount?: number; note?: string };
        await pro.must("PUT", `/api/quotes/${id}`, { ...cur, discount: patch.discount ?? cur.discount, notes: patch.note ? `${cur.notes ? cur.notes + " " : ""}${patch.note}` : cur.notes });
        break;
      }
      case "accept": await act(who!.api, { type: "accept", ...(p[0] ? { message: p[0] } : {}), rev: await rev() }); break;
      case "reject": await act(who!.api, { type: "reject", ...(p[0] ? { reason: p[0] } : {}), ...(p[1] ? { message: p[1] } : {}), rev: await rev() }); break;
      case "progress": await act(pro, { type: "progress", progress: p[0], ...(p[1] ? { message: p[1] } : {}) }); break;
      case "review": await act(who!.api, { type: "review", rating: p[0], comment: p[1] }); break;
      case "cm": await (p[0] === "c" ? who!.api : pro).must("POST", `/api/quotes/${id}/comments`, { lineId: (await pro.must("GET", `/api/quotes/${id}`)).lines[p[1]].id, body: p[2] }); break;
      case "status": {
        const cur: Quote = await pro.must("GET", `/api/quotes/${id}`);
        await pro.must("PUT", `/api/quotes/${id}`, { ...cur, status: p[0] });
        break;
      }
    }
  }
  created.push({ id, age: sc.age, last: sc.last });
  n++;
}
console.log(`devis créés pour ${PRO.display} : ${n}`);

// ---------- conversations ----------
type Chat = { client: string; age: number; last: number; unreadForPro?: boolean; msgs: ["c" | "m", string][] };
const CHATS: Chat[] = [
  { client: "lalao", age: 34, last: 3, msgs: [["c", "Bonjour, nous avons bien reçu le devis de l'extension. Quand pouvez-vous passer pour le métré final ?"], ["m", "Bonjour Mme Lalao, je passe jeudi à 9 h avec mon chef d'atelier."], ["c", "Parfait, jeudi 9 h. Le portail sera ouvert."], ["m", "Métré fait, tout est conforme. Nous lançons la commande des profilés."], ["c", "Merci ! Pouvez-vous m'envoyer une photo de l'avancement quand la baie sera montée en atelier ?"], ["m", "Bien sûr, je vous envoie ça dès que la baie est assemblée."]] },
  { client: "hery", age: 20, last: 1, unreadForPro: true, msgs: [["c", "Bonjour, la porte d'entrée en chêne doré, elle sera bien du même ton que le portail ?"], ["m", "Oui, c'est la même finition. Je vous envoie un échantillon de couleur mercredi."], ["c", "Super, merci. Pour la livraison à Antsirabe, c'est bien la semaine du 10 ?"], ["m", "Oui, camion prévu le lundi 10, pose sur deux jours."], ["c", "Pouvez-vous confirmer qu'il y aura quelqu'un pour décharger ? Je serai sur place seulement l'après-midi."]] },
  { client: "toky", age: 17, last: 2, unreadForPro: true, msgs: [["c", "Bonjour, pour la boutique, pouvez-vous me confirmer le délai si j'accepte cette semaine ?"], ["m", "Bonjour M. Toky, 3 semaines après l'acompte, pose en dehors des heures d'ouverture si vous le souhaitez."], ["c", "Très bien. Je vous ai demandé 8 % de remise dans le devis, vous en pensez quoi ?"]] },
  { client: "noro", age: 55, last: 3, msgs: [["c", "Bonjour, j'ai bien reçu le devis des volets roulants."], ["m", "Merci Mme Noro, n'hésitez pas si vous voulez changer la couleur ou passer en motorisé."], ["c", "Je vais regarder avec mon mari et je reviens vers vous."]] },
];
const convs: { id: string; age: number; last: number; n: number; unread: boolean }[] = [];
for (const ch of CHATS) {
  const c = clients[ch.client];
  const conv = await c.api.must("POST", "/api/conversations", { menuisier: slug });
  for (const [who, body] of ch.msgs) await (who === "c" ? c.api : pro).must("POST", `/api/conversations/${conv.id}/messages`, { body });
  convs.push({ id: conv.id, age: ch.age, last: ch.last, n: ch.msgs.length, unread: !!ch.unreadForPro });
}
console.log(`conversations créées : ${convs.length}`);

mkdirSync(".data", { recursive: true });
writeFileSync(".data/seed-dates.json", JSON.stringify({ quotes: created, convs }, null, 2));
console.log("dates à étaler : .data/seed-dates.json (puis `npx tsx scripts/backdate-demo.ts`, serveur arrêté)");
console.log(`Comptes : ${PRO.email} (menuisier) ; ${CLIENTS.map((c) => c.email).join(", ")} (clients)`);
