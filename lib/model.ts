import { z } from "zod";
import type { Messages } from "./messages/fr";

type Label = keyof Messages;

// ---------- Catalogues d'options (source unique : formulaire, calcul, PDF, validation) ----------
export const CATEGORIES = ["fenetre", "porte", "volet", "garde-corps", "cloison"] as const;
export const OPENINGS = ["coulissant", "ouvrant", "oscillo", "soufflet", "jalousie", "fixe"] as const;
export const GUARDS = ["barreaudage", "verre"] as const;
export const RANGES = ["europeen", "asiatique"] as const;
export const SHUTTERS = ["roulant", "rideau"] as const;
export const CONTROLS = ["manuel", "motorise"] as const;
// Options des volets : coffre, lames (roulant : largeur ; rideau métallique : type de tablier) et moustiquaire intégrée.
export const BOXES = ["apparent", "encastre", "tunnel"] as const;
export const SLATS_ROULANT = ["39", "42", "55"] as const;
export const SLATS_RIDEAU = ["pleine", "perforee", "grille"] as const;
export type Box = (typeof BOXES)[number];
export type Slat = (typeof SLATS_ROULANT)[number] | (typeof SLATS_RIDEAU)[number];
// Pas des lames (mm) : nombre de lames d'un roulant = hauteur / pas.
export const SLAT_PITCH: Record<(typeof SLATS_ROULANT)[number], number> = { "39": 37, "42": 40, "55": 53 };
export const INFILLS = ["vitree", "semi", "pleine"] as const;
export const EXTRAS = ["moustiquaire", "grille"] as const;
export const THICKNESSES = ["4", "5", "6", "8", "10", "4/12/4", "6/12/6"] as const;
export const PATTERNS = ["none", "granite", "martele", "cathedrale", "cannele"] as const;
// requested : demandé par un client ; draft : en préparation ; sent : devis reçu par le client ; negotiation : le client demande une modification
export const STATUSES = ["requested", "draft", "sent", "negotiation", "accepted", "in_progress", "completed", "rejected"] as const;
// Constantes partagées par le navigateur et le serveur : ne jamais les définir dans un module qui touche à la base de données.
export const SPECIALTIES = ["fenetres", "portes", "volets", "garde-corps", "cloisons", "vitrerie", "renovation", "sur-mesure"] as const;
export const REPORT_REASONS = ["quality", "no_response", "price", "behavior", "fraud", "other"] as const;
export const ROLES = ["client", "menuisier", "admin"] as const;
export type Role = (typeof ROLES)[number];

export type Category = (typeof CATEGORIES)[number];
export type Opening = (typeof OPENINGS)[number];
export type Status = (typeof STATUSES)[number];

// Ouvertures proposées par catégorie (« jalousie » = naco, fenêtre à lames de verre).
export const OPENINGS_BY_CATEGORY: Record<Category, readonly Opening[]> = {
  fenetre: ["coulissant", "ouvrant", "oscillo", "soufflet", "jalousie", "fixe"],
  porte: ["coulissant", "ouvrant"],
  volet: [],
  "garde-corps": [],
  cloison: [],
};

// Nombre de vantaux : quelques valeurs rapides, mais tout entier entre min et max est accepté.
type Spec = { presets: readonly number[]; min: number; max: number };
const LEAVES_SPEC: Record<Opening, Spec> = {
  coulissant: { presets: [2, 3, 4], min: 2, max: 8 },
  ouvrant: { presets: [1, 2], min: 1, max: 6 },
  oscillo: { presets: [1, 2], min: 1, max: 4 },
  soufflet: { presets: [1, 2], min: 1, max: 4 },
  jalousie: { presets: [1], min: 1, max: 1 },
  fixe: { presets: [1], min: 1, max: 1 },
};
const PANELS_SPEC: Spec = { presets: [2, 3, 4, 5], min: 1, max: 10 };
export const leavesSpec = (l: { category: Category; opening: Opening }): Spec | null =>
  l.category === "cloison" ? PANELS_SPEC : l.category === "fenetre" || l.category === "porte" ? LEAVES_SPEC[l.opening] : null;

// ---------- Configuration des vantaux ----------
// Chaque vantail a un mode : F = fixe, L / R = coulisse vers la gauche / la droite (coulissant) ou charnières à gauche / à droite (battant),
// B = double sens (va-et-vient : la porte s'ouvre dans les deux sens, réservé aux portes battantes).
export const LEAF_MODES = ["F", "L", "R", "B"] as const;
export type LeafMode = (typeof LEAF_MODES)[number];
// Raccourcis : côté d'ouverture. « both » (coulissant) : les deux vantaux d'une paire s'ouvrent l'un vers l'autre, chacun de moitié.
export const DIRECTIONS = ["left", "right", "both"] as const;
export type Direction = (typeof DIRECTIONS)[number];

type Cfg = { opening: Opening; leaves: number; direction?: Direction; leafCfg?: LeafMode[] };

export function presetModes(l: Pick<Cfg, "opening" | "leaves">, d: Direction = "left"): LeafMode[] {
  const n = l.leaves;
  return Array.from({ length: n }, (_, i): LeafMode => {
    if (l.opening === "fixe") return "F";
    if (l.opening === "soufflet") return "L"; // un soufflet pivote par le haut : pas de côté
    if (l.opening === "coulissant") return d === "left" ? (i % 2 ? "L" : "F") : d === "right" ? (i % 2 || i + 1 >= n ? "F" : "R") : i % 2 ? "L" : i + 1 < n ? "R" : "F";
    return n === 1 ? (d === "right" ? "R" : "L") : i < n / 2 ? "L" : "R";
  });
}
// Modes effectifs : ceux saisis par le menuisier s'ils sont complets, sinon le raccourci de sens d'ouverture.
export const leafModes = (l: Cfg): LeafMode[] => (l.leafCfg?.length === l.leaves ? l.leafCfg : presetModes(l, l.direction));

// Comportement de chaque vantail. Source unique : le schéma (flèches, charnières, repères) et la vue 3D (animation) la lisent.
// slide : -1 glisse à gauche, 1 à droite, 0 immobile. travel : course en fraction d'un pas de vantail (1/2 si le voisin vient à sa rencontre).
// front : rail avant (les rails alternent). hingeLeft : charnières à gauche. fixed : vantail dormant, sans mouvement.
export function leafMotion(l: Cfg) {
  const modes = leafModes(l);
  const n = l.leaves;
  const sliding = l.opening === "coulissant";
  const slide = modes.map((m, i) => (!sliding ? 0 : m === "L" && i > 0 ? -1 : m === "R" && i < n - 1 ? 1 : 0));
  return modes.map((m, i) => ({
    slide: slide[i],
    travel: slide[i] && slide[i + slide[i]] === -slide[i] ? 0.5 : 1,
    front: i % 2 === 1,
    hingeLeft: m !== "R",
    both: m === "B",
    fixed: l.opening === "fixe" || (sliding ? slide[i] === 0 : m === "F"),
  }));
}

// Repères professionnels : V1, V2… pour les vantaux mobiles, F1, F2… pour les parties fixes (de gauche à droite) ; P1… pour les panneaux de cloison.
export function leafMarks(l: Cfg & { category: Category }): string[] {
  if (l.category === "cloison") return Array.from({ length: l.leaves }, (_, i) => `P${i + 1}`);
  let v = 0;
  let f = 0;
  return leafMotion(l).map((m) => (m.fixed ? `F${++f}` : `V${++v}`));
}

const MARK: Record<Category, string> = { fenetre: "F", porte: "P", volet: "VR", "garde-corps": "GC", cloison: "CL" };
// Repère d'ouvrage : lettre de catégorie + rang dans la catégorie (F-01, P-02…).
export function lineMarks(lines: readonly { category: Category }[]): string[] {
  const seen: Partial<Record<Category, number>> = {};
  return lines.map((l) => `${MARK[l.category]}-${String((seen[l.category] = (seen[l.category] ?? 0) + 1)).padStart(2, "0")}`);
}

// Un ouvrage a des vantaux configurables s'il s'ouvre (fenêtre ou porte, sauf fixe).
export const hasLeafConfig = (l: { category: Category; opening: Opening }) => (l.category === "fenetre" || l.category === "porte") && l.opening !== "fixe" && l.opening !== "jalousie";

export const FINISHES = [
  { id: "blanc", group: "laque", hex: "#f5f5f2", label: "finish.blanc" },
  { id: "noir", group: "laque", hex: "#1c1c1c", label: "finish.noir" },
  { id: "anthracite", group: "laque", hex: "#41454a", label: "finish.anthracite" },
  { id: "bronze", group: "laque", hex: "#6b4f3a", label: "finish.bronze" },
  { id: "marron", group: "laque", hex: "#4a2f23", label: "finish.marron" },
  { id: "naturel", group: "anodise", hex: "#c4c7cc", label: "finish.naturel" },
  { id: "champagne", group: "anodise", hex: "#d6c3a0", label: "finish.champagne" },
  { id: "chene-dore", group: "fauxbois", hex: "#b9854a", label: "finish.chene-dore" },
  { id: "chene-clair", group: "fauxbois", hex: "#d2a56b", label: "finish.chene-clair" },
  { id: "noyer", group: "fauxbois", hex: "#6e4528", label: "finish.noyer" },
  { id: "acajou", group: "fauxbois", hex: "#7a3321", label: "finish.acajou" },
] as const satisfies readonly { id: string; group: string; hex: string; label: Label }[];
export type FinishId = (typeof FINISHES)[number]["id"];
export const FINISH_IDS = FINISHES.map((f) => f.id) as [FinishId, ...FinishId[]];
export const FINISH_GROUPS = [
  ["laque", "finish.group.laque"],
  ["anodise", "finish.group.anodise"],
  ["fauxbois", "finish.group.fauxbois"],
] as const satisfies readonly (readonly [string, Label])[];

export const GLASSES = [
  { id: "clair", label: "glass.clair" },
  { id: "teinte-bronze", label: "glass.teinte-bronze" },
  { id: "teinte-gris", label: "glass.teinte-gris" },
  { id: "teinte-vert", label: "glass.teinte-vert" },
  { id: "reflechissant", label: "glass.reflechissant" },
  { id: "feuillete", label: "glass.feuillete" },
  { id: "trempe", label: "glass.trempe" },
  { id: "depoli", label: "glass.depoli" },
] as const satisfies readonly { id: string; label: Label }[];
export type GlassId = (typeof GLASSES)[number]["id"];
export const GLASS_IDS = GLASSES.map((g) => g.id) as [GlassId, ...GlassId[]];
// Le motif n'a pas de sens sur un verre déjà traité (miroir, feuilleté, dépoli).
export const PATTERN_GLASSES: readonly GlassId[] = ["clair", "teinte-bronze", "teinte-gris", "teinte-vert", "trempe"];

// ---------- Validation (frontière de confiance : le serveur ne croit jamais le client) ----------
const text = (max: number) => z.string().max(max);

export const lineSchema = z.object({
  id: z.string().min(1).max(64),
  category: z.enum(CATEGORIES),
  opening: z.enum(OPENINGS),
  leaves: z.number().int().min(1).max(10), // 10 = maximum de panneaux d'une cloison
  guard: z.enum(GUARDS).default("barreaudage"),
  direction: z.enum(DIRECTIONS).optional(),
  leafCfg: z.array(z.enum(LEAF_MODES)).max(10).optional(),
  shutter: z.enum(SHUTTERS),
  control: z.enum(CONTROLS),
  box: z.enum(BOXES).optional(),
  slat: z.enum([...SLATS_ROULANT, ...SLATS_RIDEAU]).optional(),
  net: z.boolean().optional(), // moustiquaire intégrée (volet)
  range: z.enum(RANGES),
  finish: z.enum(FINISH_IDS),
  infill: z.enum(INFILLS),
  glassType: z.enum(GLASS_IDS),
  thickness: z.enum(THICKNESSES),
  pattern: z.enum(PATTERNS),
  extras: z.array(z.enum(EXTRAS)).max(EXTRAS.length),
  width: z.number().min(200).max(6000),
  height: z.number().min(200).max(6000),
  qty: z.number().int().min(1).max(999),
  room: text(60).optional(), // où l'ouvrage se pose (« Chambre 1, façade sud »)
  note: text(300).optional(), // remarque libre sur l'ouvrage (visible du client)
  unit: z.number().min(0).max(1e10), // prix unitaire en Ar : calculé puis modifiable à la main
});
export type Line = z.infer<typeof lineSchema>;

const requestSchema = z.object({ message: text(1500), siteAddress: text(200), wantedDate: text(40) });
export type QuoteRequest = z.infer<typeof requestSchema>;

// Modèle du devis (feuille et PDF). Personnalisation CADRÉE : le menuisier choisit la mise en page et le style, jamais le fond.
// Les mentions obligatoires (identité, NIF/STAT, numéro, date, validité, client, détail, totaux HT/TVA/TTC, conditions de paiement, signatures)
// sont toujours imprimées, quel que soit le modèle (voir docs/architecture.md).
export const DOC_HEADERS = ["split", "center", "banner"] as const;
export const DOC_TABLES = ["zebra", "lines", "boxed"] as const;
export const DOC_FONTS = ["sans", "serif"] as const;
export const DOC_DENSITIES = ["comfortable", "compact"] as const;
export const docStyleSchema = z.object({
  header: z.enum(DOC_HEADERS), // split : logo + société à gauche, devis à droite ; center : tout centré ; banner : bandeau de couleur
  table: z.enum(DOC_TABLES), // zebra : lignes alternées ; lines : filets ; boxed : grille complète
  font: z.enum(DOC_FONTS),
  density: z.enum(DOC_DENSITIES),
  drawings: z.boolean(), // schéma de chaque ouvrage
  footer: text(300), // message libre en pied de devis (remerciement, conditions particulières)
});
export type DocStyle = z.infer<typeof docStyleSchema>;
// Modèles prêts à l'emploi ; le menuisier part de l'un d'eux puis ajuste (alors « personnalisé »).
export const DOC_PRESETS = {
  classique: { header: "split", table: "zebra", font: "sans", density: "comfortable", drawings: true, footer: "" },
  moderne: { header: "banner", table: "lines", font: "sans", density: "comfortable", drawings: true, footer: "" },
  elegant: { header: "center", table: "boxed", font: "serif", density: "comfortable", drawings: true, footer: "" },
  compact: { header: "split", table: "lines", font: "sans", density: "compact", drawings: false, footer: "" },
} as const satisfies Record<string, DocStyle>;
export type DocPreset = keyof typeof DOC_PRESETS;

// Prestations hors ouvrage (pose, dépose, déplacement…) : lignes libres chiffrées en Ar, comptées dans le total avant remise.
export const SERVICE_KINDS = ["pose", "depose", "deplacement", "autre"] as const;
export type ServiceKind = (typeof SERVICE_KINDS)[number];
export const serviceSchema = z.object({
  id: z.string().min(1).max(64),
  kind: z.enum(SERVICE_KINDS),
  label: text(120),
  qty: z.number().min(0).max(9999),
  price: z.number().min(0).max(1e10), // prix unitaire en Ar
});
export type Service = z.infer<typeof serviceSchema>;

export const quoteSchema = z.object({
  id: z.uuid(),
  number: text(32),
  date: z.string().max(40),
  status: z.enum(STATUSES),
  client: z.object({ name: text(120), phone: text(40), address: text(200), email: text(160).default("") }), // e-mail : sert à retrouver le compte client à l'envoi
  project: text(200),
  delay: text(120),
  notes: text(600),
  lines: z.array(lineSchema).min(1).max(50),
  services: z.array(serviceSchema).max(20).optional(),
  warranty: z.number().int().min(0).max(240).optional(), // garantie en mois (absent ou 0 : non indiquée)
  docStyle: docStyleSchema.optional(), // modèle propre à ce devis ; absent : le modèle des réglages
  discount: z.number().min(0).max(100).default(0), // remise en % sur le total HT
  // champs gérés par le serveur : ignorés quand le client de l'API les envoie
  clientId: z.uuid().nullable().optional(),
  progress: z.number().int().min(0).max(100).default(0),
  rev: z.number().int().min(0).default(0), // révision : +1 à chaque modification d'un devis déjà envoyé ; le client répond à une révision précise
  request: requestSchema.nullable().optional(),
  // figés à la création : modifier les réglages ne change pas un devis déjà émis
  terms: z.object({ tva: z.number().min(0).max(100), deposit: z.number().min(0).max(100), validityDays: z.number().int().min(1).max(365) }),
});
export type Quote = z.infer<typeof quoteSchema>;

// ---------- Tarifs et majorations ----------
export const TARIFF_KEYS = [
  "fenetre.coulissant",
  "fenetre.ouvrant",
  "fenetre.oscillo",
  "fenetre.soufflet",
  "fenetre.jalousie",
  "fenetre.fixe",
  "porte.coulissant",
  "porte.ouvrant",
  "volet.roulant",
  "volet.rideau",
  "garde-corps.barreaudage",
  "garde-corps.verre",
  "cloison.fixe",
] as const;
export type TariffKey = (typeof TARIFF_KEYS)[number];
export type Tariffs = Record<TariffKey, number>; // Ar par m², gamme asiatique, profil blanc, verre clair 5 mm

// Majorations en % du prix de base. `group` ne sert qu'à l'affichage dans les réglages.
export const SURCHARGES: readonly { key: string; group: Label; label: Label; def: number }[] = [
  { key: "range.europeen", group: "surcharge.group.range", label: "range.europeen", def: 35 },
  { key: "finish.anodise", group: "surcharge.group.finish", label: "finish.group.anodise", def: 5 },
  { key: "finish.fauxbois", group: "surcharge.group.finish", label: "finish.group.fauxbois", def: 15 },
  ...GLASSES.filter((g) => g.id !== "clair").map((g, i) => ({
    key: `glass.${g.id}`,
    group: "surcharge.group.glass" as Label,
    label: g.label as Label,
    def: [8, 8, 8, 15, 25, 20, 10][i],
  })),
  ...THICKNESSES.filter((t) => t !== "4" && t !== "5").map((t, i) => ({
    key: `thickness.${t}`,
    group: "surcharge.group.thickness" as Label,
    label: `thickness.${t}` as Label,
    def: [5, 12, 20, 45, 70][i],
  })),
  { key: "pattern.any", group: "surcharge.group.glass", label: "surcharge.pattern", def: 8 },
  { key: "extra.moustiquaire", group: "surcharge.group.extras", label: "extra.moustiquaire", def: 6 },
  { key: "extra.grille", group: "surcharge.group.extras", label: "extra.grille", def: 12 },
  { key: "control.motorise", group: "surcharge.group.shutter", label: "control.motorise", def: 45 },
  { key: "volet.box.encastre", group: "surcharge.group.shutter", label: "box.encastre", def: 10 },
  { key: "volet.box.tunnel", group: "surcharge.group.shutter", label: "box.tunnel", def: -15 },
  { key: "volet.slat.55", group: "surcharge.group.shutter", label: "slat.55", def: -5 },
  { key: "volet.slat.perforee", group: "surcharge.group.shutter", label: "slat.perforee", def: 6 },
  { key: "volet.slat.grille", group: "surcharge.group.shutter", label: "slat.grille", def: 10 },
  { key: "volet.net", group: "surcharge.group.shutter", label: "editor.vnet", def: 20 },
];
export const SURCHARGE_DEFAULTS: Record<string, number> = Object.fromEntries(SURCHARGES.map((s) => [s.key, s.def]));

// ---------- Marché des profilés : ce que le menuisier peut acheter (longueurs de barre et prix) ----------
export const PROFILE_KEYS: readonly Label[] = [
  "pf.dormant", "pf.sash", "pf.battement", "pf.mid", "pf.louvre", "pf.box", "pf.guide",
  "pf.slat", "pf.shaft", "pf.slatR", "pf.post", "pf.rail", "pf.bar", "pf.mullion",
];
// Accessoires (quincaillerie) : prix à l'unité ou au mètre ; les quantités par ouvrage sont calculées (voir accessoriesFor).
export const ACCESSORIES = [
  { key: "acc.handle", unit: "piece", def: 12000 },
  { key: "acc.doorHandle", unit: "piece", def: 35000 },
  { key: "acc.knob", unit: "piece", def: 15000 },
  { key: "acc.lock", unit: "piece", def: 45000 },
  { key: "acc.hinge", unit: "piece", def: 6000 },
  { key: "acc.roller", unit: "piece", def: 5000 },
  { key: "acc.sliderLock", unit: "piece", def: 10000 },
  { key: "acc.seal", unit: "ml", def: 1500 },
  { key: "acc.net", unit: "piece", def: 30000 },
  { key: "acc.plate", unit: "piece", def: 8000 },
  { key: "acc.motor", unit: "piece", def: 180000 },
  { key: "acc.crank", unit: "piece", def: 25000 },
  { key: "acc.silicone", unit: "piece", def: 7000 },
] as const satisfies readonly { key: Label; unit: "piece" | "ml"; def: number }[];
export type AccessoryKey = (typeof ACCESSORIES)[number]["key"];
// Verre : prix au m² pour une épaisseur simple de 4 à 6 mm ; le double vitrage et les fortes épaisseurs sont majorés dans le calcul.
export const GLASS_PRICE_DEFAULTS: Record<string, number> = { clair: 70000, "teinte-bronze": 95000, "teinte-gris": 95000, "teinte-vert": 95000, reflechissant: 120000, feuillete: 150000, trempe: 140000, depoli: 90000 };

export type Offer = { length: number; price: number; off?: boolean }; // une barre à l'achat : longueur (mm), prix (Ar) ; off : plus disponible chez le fournisseur
export type Market = {
  offers: Record<string, Offer[]>; // par profilé, pour la gamme asiatique et un profilé blanc
  rangeMarkup: number; // % ajouté au prix de la barre en gamme européenne
  finishMarkup: { anodise: number; fauxbois: number }; // % ajouté pour un profilé anodisé ou faux bois (par défaut du groupe)
  finishPct?: Partial<Record<FinishId, number>>; // majoration propre à une couleur : remplace celle de son groupe
  accessories?: Record<string, number>; // prix par accessoire (Ar, à la pièce ou au mètre)
  glass?: Record<string, number>; // prix du verre au m², par type
  off?: { ranges?: Line["range"][]; finishes?: FinishId[]; profiles?: string[] }; // ce que les fournisseurs n'ont pas (tout est disponible par défaut)
};

// Disponibilité et majoration lues dans le catalogue des fournisseurs.
export const rangeOn = (m: Market, r: Line["range"]) => !m.off?.ranges?.includes(r);
export const finishOn = (m: Market, f: FinishId) => !m.off?.finishes?.includes(f);
export const profileOn = (m: Market, p: string) => !m.off?.profiles?.includes(p);
export const groupMarkup = (m: Market, f: FinishId) => {
  const g = FINISHES.find((x) => x.id === f)?.group;
  return g === "anodise" ? m.finishMarkup.anodise : g === "fauxbois" ? m.finishMarkup.fauxbois : 0;
};
export const finishMarkup = (m: Market, f: FinishId) => m.finishPct?.[f] ?? groupMarkup(m, f);

// valeurs d'exemple : prix d'une barre de 6 m ; la barre de 4 m est proposée à ~72 % du prix
const BAR_PRICE: Record<string, number> = {
  "pf.dormant": 85000, "pf.sash": 70000, "pf.battement": 60000, "pf.mid": 55000, "pf.louvre": 40000, "pf.box": 120000, "pf.guide": 65000,
  "pf.slat": 45000, "pf.shaft": 50000, "pf.slatR": 38000, "pf.post": 90000, "pf.rail": 75000, "pf.bar": 30000, "pf.mullion": 70000,
};
export const DEFAULT_MARKET: Market = {
  offers: Object.fromEntries(PROFILE_KEYS.map((k) => [k, [{ length: 6000, price: BAR_PRICE[k] }, { length: 4000, price: Math.round((BAR_PRICE[k] * 0.72) / 1000) * 1000 }]])),
  rangeMarkup: 40,
  finishMarkup: { anodise: 12, fauxbois: 30 },
  accessories: Object.fromEntries(ACCESSORIES.map((a) => [a.key, a.def])),
  glass: GLASS_PRICE_DEFAULTS,
};

const offerSchema = z.object({ length: z.number().int().min(500).max(12000), price: z.number().min(0).max(1e8), off: z.boolean().optional() });
export const marketSchema = z.object({
  offers: z.record(z.string(), z.array(offerSchema).max(8)),
  rangeMarkup: z.number().min(-90).max(500),
  finishMarkup: z.object({ anodise: z.number().min(-90).max(500), fauxbois: z.number().min(-90).max(500) }),
  accessories: z.record(z.string(), z.number().min(0).max(1e8)).optional(),
  glass: z.record(z.string(), z.number().min(0).max(1e8)).optional(),
  finishPct: z.partialRecord(z.enum(FINISH_IDS), z.number().min(-90).max(500)).optional(),
  off: z.object({ ranges: z.array(z.enum(RANGES)).max(RANGES.length).optional(), finishes: z.array(z.enum(FINISH_IDS)).max(FINISHES.length).optional(), profiles: z.array(z.string().max(40)).max(40).optional() }).optional(),
});


// Chiffrage au prix de revient : temps de travail (minutes) par ouvrage et taux horaire, frais généraux et marge en %.
export const laborSchema = z.object({
  rate: z.number().min(0).max(1e6), // Ar / heure
  fixedMin: z.number().min(0).max(600), // préparation, assemblage, finition : par ouvrage
  cutMin: z.number().min(0).max(30), // par coupe de profilé
  leafMin: z.number().min(0).max(300), // par vantail (montage, quincaillerie)
  glazingMin: z.number().min(0).max(120), // par m² de verre posé
});
export type Labor = z.infer<typeof laborSchema>;
export const PRICING_MODES = ["m2", "cost"] as const;

export const settingsSchema = z.object({
  company: text(120),
  address: text(200),
  phone: text(60),
  email: text(120),
  website: text(120),
  nif: text(40),
  stat: text(40),
  paymentInfo: text(300),
  barLength: z.number().int().min(3000).max(8000),
  kerf: z.number().min(0).max(20),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  logo: z.string().max(700_000).refine((s) => s === "" || s.startsWith("data:image/"), "image"),
  signature: z.string().max(700_000).refine((s) => s === "" || s.startsWith("data:image/"), "image"),
  signer: text(120),
  tva: z.number().min(0).max(100),
  deposit: z.number().min(0).max(100),
  validityDays: z.number().int().min(1).max(365),
  minArea: z.number().min(0).max(10),
  docStyle: docStyleSchema,
  pricing: z.enum(PRICING_MODES), // m2 : tarif au m² ; cost : matière + main-d'œuvre + frais + marge
  labor: laborSchema,
  overheadPct: z.number().min(0).max(200), // frais généraux, en % du déboursé sec
  marginPct: z.number().min(0).max(300), // marge visée, en % du prix de revient
  minMarginPct: z.number().min(0).max(100), // sous ce seuil, l'éditeur alerte
  tariffs: z.record(z.string(), z.number().min(0).max(1e9)),
  surcharges: z.record(z.string(), z.number().min(-90).max(500)),
  market: marketSchema,
});
export type Settings = z.infer<typeof settingsSchema> & { tariffs: Tariffs };
// Ce que le client voit de l'entreprise sur son devis (les mêmes mentions que sur le PDF) : jamais les tarifs ni les prix d'achat.
export const ISSUER_KEYS = ["company", "address", "phone", "email", "website", "nif", "stat", "logo", "accent", "paymentInfo", "signature", "signer", "minArea", "docStyle"] as const;
export type Issuer = Pick<Settings, (typeof ISSUER_KEYS)[number]>;

export const DEFAULT_SETTINGS: Settings = {
  company: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  nif: "",
  stat: "",
  paymentInfo: "",
  barLength: 6000,
  kerf: 5,
  accent: "#1d4ed8",
  logo: "",
  signature: "",
  signer: "",
  tva: 20,
  deposit: 50,
  validityDays: 30,
  minArea: 1,
  docStyle: { ...DOC_PRESETS.classique },
  pricing: "m2",
  labor: { rate: 5000, fixedMin: 30, cutMin: 1.5, leafMin: 45, glazingMin: 20 }, // valeurs d'exemple à calibrer sur l'atelier
  overheadPct: 15,
  marginPct: 30,
  minMarginPct: 15,
  // valeurs d'exemple : chaque menuisier règle ses propres prix au m²
  tariffs: {
    "fenetre.coulissant": 450000,
    "fenetre.ouvrant": 480000,
    "fenetre.oscillo": 520000,
    "fenetre.soufflet": 400000,
    "fenetre.jalousie": 350000,
    "fenetre.fixe": 300000,
    "porte.coulissant": 520000,
    "porte.ouvrant": 560000,
    "volet.roulant": 380000,
    "volet.rideau": 300000,
    "garde-corps.barreaudage": 350000,
    "garde-corps.verre": 700000,
    "cloison.fixe": 420000,
  },
  surcharges: SURCHARGE_DEFAULTS,
  market: DEFAULT_MARKET,
};

// Complète une valeur lue en base avec les valeurs par défaut (nouvelles clés ajoutées après coup).
export const withDefaults = (s: Partial<Settings> | null | undefined): Settings => ({
  ...DEFAULT_SETTINGS,
  ...s,
  docStyle: { ...DEFAULT_SETTINGS.docStyle, ...s?.docStyle },
  labor: { ...DEFAULT_SETTINGS.labor, ...s?.labor },
  tariffs: { ...DEFAULT_SETTINGS.tariffs, ...s?.tariffs },
  surcharges: { ...SURCHARGE_DEFAULTS, ...s?.surcharges },
  market: {
    offers: { ...DEFAULT_MARKET.offers, ...s?.market?.offers },
    rangeMarkup: s?.market?.rangeMarkup ?? DEFAULT_MARKET.rangeMarkup,
    finishMarkup: { ...DEFAULT_MARKET.finishMarkup, ...s?.market?.finishMarkup },
    finishPct: s?.market?.finishPct,
    accessories: { ...DEFAULT_MARKET.accessories, ...s?.market?.accessories },
    glass: { ...DEFAULT_MARKET.glass, ...s?.market?.glass },
    off: s?.market?.off,
  },
});
