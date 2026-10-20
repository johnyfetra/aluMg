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
export const INFILLS = ["vitree", "semi", "pleine"] as const;
export const EXTRAS = ["moustiquaire", "grille"] as const;
export const THICKNESSES = ["4", "5", "6", "8", "10", "4/12/4", "6/12/6"] as const;
export const PATTERNS = ["none", "granite", "martele", "cathedrale", "cannele"] as const;
export const STATUSES = ["draft", "sent", "accepted", "rejected"] as const;

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
  leaves: z.number().int().min(1).max(8),
  guard: z.enum(GUARDS).default("barreaudage"),
  shutter: z.enum(SHUTTERS),
  control: z.enum(CONTROLS),
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
  unit: z.number().min(0).max(1e10), // prix unitaire en Ar : calculé puis modifiable à la main
});
export type Line = z.infer<typeof lineSchema>;

export const quoteSchema = z.object({
  id: z.uuid(),
  number: text(32),
  date: z.string().max(40),
  status: z.enum(STATUSES),
  client: z.object({ name: text(120), phone: text(40), address: text(200) }),
  project: text(200),
  delay: text(120),
  notes: text(600),
  lines: z.array(lineSchema).min(1).max(50),
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
];
export const SURCHARGE_DEFAULTS: Record<string, number> = Object.fromEntries(SURCHARGES.map((s) => [s.key, s.def]));

// ---------- Marché des profilés : ce que le menuisier peut acheter (longueurs de barre et prix) ----------
export const PROFILE_KEYS: readonly Label[] = [
  "pf.dormant", "pf.sash", "pf.battement", "pf.mid", "pf.louvre", "pf.box", "pf.guide",
  "pf.slat", "pf.shaft", "pf.slatR", "pf.post", "pf.rail", "pf.bar", "pf.mullion",
];
export type Offer = { length: number; price: number }; // une barre à l'achat : longueur (mm) et prix (Ar)
export type Market = {
  offers: Record<string, Offer[]>; // par profilé, pour la gamme asiatique et un profilé blanc
  rangeMarkup: number; // % ajouté au prix de la barre en gamme européenne
  finishMarkup: { anodise: number; fauxbois: number }; // % ajouté pour un profilé anodisé ou faux bois
};

// valeurs d'exemple : prix d'une barre de 6 m ; la barre de 4 m est proposée à ~72 % du prix
const BAR_PRICE: Record<string, number> = {
  "pf.dormant": 85000, "pf.sash": 70000, "pf.battement": 60000, "pf.mid": 55000, "pf.louvre": 40000, "pf.box": 120000, "pf.guide": 65000,
  "pf.slat": 45000, "pf.shaft": 50000, "pf.slatR": 38000, "pf.post": 90000, "pf.rail": 75000, "pf.bar": 30000, "pf.mullion": 70000,
};
export const DEFAULT_MARKET: Market = {
  offers: Object.fromEntries(PROFILE_KEYS.map((k) => [k, [{ length: 6000, price: BAR_PRICE[k] }, { length: 4000, price: Math.round((BAR_PRICE[k] * 0.72) / 1000) * 1000 }]])),
  rangeMarkup: 40,
  finishMarkup: { anodise: 12, fauxbois: 30 },
};

const offerSchema = z.object({ length: z.number().int().min(500).max(12000), price: z.number().min(0).max(1e8) });
const marketSchema = z.object({
  offers: z.record(z.string(), z.array(offerSchema).max(8)),
  rangeMarkup: z.number().min(-90).max(500),
  finishMarkup: z.object({ anodise: z.number().min(-90).max(500), fauxbois: z.number().min(-90).max(500) }),
});

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
  tariffs: z.record(z.string(), z.number().min(0).max(1e9)),
  surcharges: z.record(z.string(), z.number().min(-90).max(500)),
  market: marketSchema,
});
export type Settings = z.infer<typeof settingsSchema> & { tariffs: Tariffs };

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
  tariffs: { ...DEFAULT_SETTINGS.tariffs, ...s?.tariffs },
  surcharges: { ...SURCHARGE_DEFAULTS, ...s?.surcharges },
  market: {
    offers: { ...DEFAULT_MARKET.offers, ...s?.market?.offers },
    rangeMarkup: s?.market?.rangeMarkup ?? DEFAULT_MARKET.rangeMarkup,
    finishMarkup: { ...DEFAULT_MARKET.finishMarkup, ...s?.market?.finishMarkup },
  },
});
