import type { T } from "./i18n";
import type { Category, Line, Opening, TariffKey } from "./model";

export const lineTitle = (l: Line, t: T) => {
  if (l.category === "volet") return `${t(`shutter.${l.shutter}`)} ${t(`control.${l.control}`)}`;
  if (l.category === "garde-corps") return `${t("cat.garde-corps")} ${t(`guard.${l.guard}`)}`;
  if (l.category === "cloison") return `${t("cat.cloison")} ${l.leaves} ${t("editor.panelsWord")}`;
  return `${t(`cat.${l.category}`)} ${t(`opening.${l.opening}`)}${l.leaves > 1 ? ` ${l.leaves} ${t("editor.leavesWord")}` : ""}`;
};

// Nom d'un tarif au m² (« Fenêtre coulissante », « Volet roulant »…), partagé par les réglages et le panneau des tarifs.
export const tariffLabel = (k: TariffKey, t: T) => {
  const [cat, kind] = k.split(".") as [Category, string];
  if (cat === "volet") return t(`shutter.${kind as "roulant" | "rideau"}`);
  if (cat === "garde-corps") return `${t("cat.garde-corps")} ${t(`guard.${kind as "barreaudage" | "verre"}`)}`;
  if (cat === "cloison") return t("cat.cloison");
  return `${t(`cat.${cat}`)} ${t(`opening.${kind as Opening}`)}`;
};

// Lignes de détail d'un ouvrage (gamme, couleur, vitrage, options), pour le PDF.
export function lineDetails(l: Line, t: T): string[] {
  const out = [`${t(`range.${l.range}`)} · ${t(`finish.${l.finish}`)}`];
  if (l.category === "volet") {
    out.push([t(`box.${l.box ?? "apparent"}`), t(`slat.${l.slat ?? (l.shutter === "roulant" ? "39" : "pleine")}`)].join(" · "));
    if (l.net) out.push(t("editor.vnet"));
    return out;
  }
  if (l.category === "porte") out.push(t(`infill.${l.infill}`));
  const hasGlass = l.category === "garde-corps" ? l.guard === "verre" : !(l.category === "porte" && l.infill === "pleine");
  if (hasGlass) out.push([t(`glass.${l.glassType}`), t(`thickness.${l.thickness}`), l.pattern !== "none" && t(`pattern.${l.pattern}`)].filter(Boolean).join(", "));
  if (l.extras.length) out.push(l.extras.map((e) => t(`extra.${e}`)).join(", "));
  return out;
}
