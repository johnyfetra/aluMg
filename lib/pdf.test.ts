import { describe, expect, it, vi } from "vitest";
import { fr } from "./messages/fr";
import { DOC_PRESETS, type DocStyle, type Quote, lineSchema, quoteSchema, withDefaults } from "./model";
import { buildQuotePdf } from "./pdf";
import { missingMentions, presetOf } from "./docStyle";

// Espionne jsPDF : chaque texte imprimé est enregistré (les PDF sont compressés, on ne peut pas les relire).
const spy = vi.hoisted(() => ({ texts: [] as string[] }));
vi.mock("jspdf", async (orig) => {
  const mod = await orig<typeof import("jspdf")>();
  class Spy extends mod.jsPDF {
    constructor(...a: ConstructorParameters<typeof mod.jsPDF>) {
      super(...a);
      const text = this.text.bind(this) as (...x: unknown[]) => unknown;
      (this as unknown as { text: unknown }).text = (...x: unknown[]) => {
        spy.texts.push(...([] as unknown[]).concat(x[0]).map(String));
        return text(...x);
      };
    }
  }
  return { ...mod, jsPDF: Spy };
});

const t = ((k: keyof typeof fr) => fr[k] ?? k) as never;
const q: Quote = quoteSchema.parse({
  id: crypto.randomUUID(), number: "DV-2026-0042", date: "2026-10-26T10:00:00Z", status: "sent", client: { name: "Lalao Ramanantsoa", phone: "033 90 214 65", address: "Ivandry", email: "" },
  project: "Villa Ivandry", delay: "3 semaines", notes: "", warranty: 12, terms: { tva: 20, deposit: 30, validityDays: 30 },
  services: [{ id: "s", kind: "pose", label: "Pose", qty: 1, price: 100000 }],
  lines: [lineSchema.parse({ id: "a", category: "fenetre", opening: "coulissant", leaves: 2, shutter: "roulant", control: "manuel", guard: "barreaudage", range: "asiatique", finish: "blanc", infill: "vitree", glassType: "clair", thickness: "5", pattern: "none", extras: [], width: 1200, height: 1200, qty: 1, unit: 500000, room: "Chambre 1" })],
});
const issuer = { company: "Alu Mada", address: "Antananarivo", phone: "034 12 345 67", nif: "4001234567", stat: "43111" };

// Texte imprimé pour un modèle : les mentions obligatoires doivent y être, quel que soit le modèle.
async function printed(style: Partial<DocStyle>) {
  spy.texts.length = 0;
  const s = withDefaults({ ...issuer, email: "", docStyle: { ...DOC_PRESETS.classique, ...style, drawings: false } });
  const doc = await buildQuotePdf(q, s, t, "fr", false);
  return { text: spy.texts.join("\n"), pages: doc.getNumberOfPages() };
}

describe("modèles de devis : personnalisation cadrée", () => {
  const must = ["Alu Mada", "NIF 4001234567", "STAT 43111", "DV-2026-0042", "Lalao Ramanantsoa", "Antananarivo", "Chambre 1", "Pose"];
  for (const [name, preset] of Object.entries(DOC_PRESETS)) {
    it(`« ${name} » imprime toutes les mentions obligatoires`, async () => {
      const { text, pages } = await printed(preset);
      for (const m of must) expect(text, m).toContain(m);
      expect(text).toContain("Garantie");
      expect(pages).toBeGreaterThanOrEqual(1);
    });
  }
  it("le pied de page libre s'ajoute sans retirer de mention", async () => {
    const { text } = await printed({ footer: "Merci de votre confiance." });
    expect(text).toContain("Merci de votre confiance.");
    for (const m of must) expect(text).toContain(m);
  });
  it("reconnaissance du modèle et mentions manquantes", () => {
    expect(presetOf(DOC_PRESETS.moderne)).toBe("moderne");
    expect(presetOf({ ...DOC_PRESETS.moderne, font: "serif" })).toBe("custom");
    expect(presetOf({ ...DOC_PRESETS.classique, footer: "x" })).toBe("classique"); // le pied libre ne change pas le modèle
    expect(missingMentions({ company: "A", address: "", phone: "1", nif: " ", stat: "2" })).toEqual(["address", "nif"]);
  });
  it("anciens réglages sans docStyle : modèle classique", () => {
    expect(withDefaults({ company: "X" } as never).docStyle).toEqual(DOC_PRESETS.classique);
  });
});
