import { DOC_PRESETS, type DocPreset, type DocStyle, type Issuer, type Quote, lineSchema, quoteSchema } from "./model";

// Le modèle reconnu (le pied de page libre ne compte pas) ; « custom » dès qu'un réglage s'écarte de tous les modèles.
export function presetOf(st: DocStyle): DocPreset | "custom" {
  const key = (Object.keys(DOC_PRESETS) as DocPreset[]).find((k) => {
    const p = DOC_PRESETS[k];
    return p.header === st.header && p.table === st.table && p.font === st.font && p.density === st.density && p.drawings === st.drawings;
  });
  return key ?? "custom";
}

// Mentions que l'entreprise doit renseigner pour qu'un devis soit conforme : sans elles, la feuille imprime « — » à leur place.
export const MANDATORY = ["company", "address", "phone", "nif", "stat"] as const;
export type Mandatory = (typeof MANDATORY)[number];
export const missingMentions = (s: Pick<Issuer, Mandatory>): Mandatory[] => MANDATORY.filter((k) => !s[k]?.trim());

// Devis d'exemple pour l'aperçu des réglages (jamais enregistré).
export function sampleQuote(project = "Villa Ivandry"): Quote {
  const base = { shutter: "roulant", control: "manuel", guard: "barreaudage", range: "asiatique", finish: "blanc", infill: "vitree", glassType: "clair", thickness: "5", pattern: "none", extras: [], qty: 1 } as const;
  return quoteSchema.parse({
    id: "00000000-0000-4000-8000-000000000000", number: "DV-2026-0001", date: new Date().toISOString(), status: "sent",
    client: { name: "Lalao Ramanantsoa", phone: "033 90 214 65", address: "Ivandry, Antananarivo", email: "" }, project, delay: "3 semaines", notes: "", warranty: 12,
    terms: { tva: 20, deposit: 30, validityDays: 30 },
    lines: [
      lineSchema.parse({ ...base, id: "a", category: "fenetre", opening: "coulissant", leaves: 2, width: 1500, height: 1200, unit: 480000, room: "Salon" }),
      lineSchema.parse({ ...base, id: "b", category: "porte", opening: "ouvrant", leaves: 2, leafCfg: ["B", "B"], width: 1600, height: 2100, unit: 950000, finish: "anthracite" }),
    ],
    services: [{ id: "s", kind: "pose", label: "Pose", qty: 1, price: 150000 }],
  });
}
