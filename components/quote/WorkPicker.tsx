"use client";
import { ChevronRight } from "lucide-react";
import { cap, DEFAULT_SIZE, newLine, price } from "./line";
import { normalize } from "@/lib/calc";
import { type T, useI18n } from "@/lib/i18n";
import { type Line, type Settings, WORK_TYPES, type WorkType, workPatch } from "@/lib/model";

// Applique un changement à un ouvrage : taille par défaut si la catégorie change, un seul vantail pour une porte battante,
// prix recalculé sauf s'il vient d'être fixé à la main.
export function patchLine(l: Line, patch: Partial<Line>, s: Settings): Line {
  const sizeReset = patch.category && patch.category !== l.category ? { width: DEFAULT_SIZE[patch.category][0], height: DEFAULT_SIZE[patch.category][1], leaves: patch.category === "cloison" ? 3 : 2 } : {};
  // une porte battante a un seul vantail (deux, c'est une porte à deux battants : choix du menuisier)
  const oneLeaf = (patch.opening ?? l.opening) === "ouvrant" && (patch.category ?? l.category) === "porte" && ("opening" in patch || "category" in patch) && !("leaves" in patch) ? { leaves: 1 } : {};
  const next = normalize({ ...l, ...sizeReset, ...oneLeaf, ...patch });
  return "unit" in patch ? next : { ...next, unit: price(next, s) };
}

// Nouvel ouvrage du type choisi, avec ses réglages par défaut.
export function lineOf(w: WorkType, s: Settings): Line {
  const base = newLine(s);
  return patchLine(base, workPatch(w, base), s);
}

export const workLabel = (w: WorkType, t: T) => cap(w === "naco" ? t("opening.jalousie") : w === "roulant" || w === "rideau" ? t(`shutter.${w}`) : t(`cat.${w}`));

// Premier pas d'un devis ou d'un ouvrage ajouté : on choisit d'abord ce qu'on fabrique, les réglages viennent ensuite.
export default function WorkPicker({ onPick }: { onPick: (w: WorkType) => void }) {
  const { t } = useI18n();
  return (
    <section className="space-y-3" aria-labelledby="h-pick">
      <h2 id="h-pick" className="text-lg font-semibold">{t("app.pickWork")}</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {WORK_TYPES.map((w) => (
          <li key={w}>
            <button type="button" onClick={() => onPick(w)} className="card flex min-h-14 w-full items-center justify-between gap-3 !p-4 text-left text-base font-semibold active:scale-[0.99]">
              {workLabel(w, t)}
              <ChevronRight size={20} aria-hidden className="text-primary" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
