"use client";
import { ChevronDown, Wand2 } from "lucide-react";
import { useState } from "react";
import IntakeAssistant from "./IntakeAssistant";
import { salePrice } from "@/lib/costing";
import type { T } from "@/lib/i18n";
import { toLine } from "@/lib/intake";
import type { Line, Settings } from "@/lib/model";

// Pour le menuisier : colle ou dicte la demande d'un client (message, appel noté, e-mail) ; l'application en tire les ouvrages, déjà chiffrés avec ses tarifs,
// qu'il ajoute au devis (ou qui remplacent les ouvrages actuels) puis ajuste avant d'envoyer.
export default function IntakePanel({ initial, settings, onAdd, onReplace, t }: { initial: string; settings: Settings; onAdd: (lines: Line[]) => void; onReplace: (lines: Line[]) => void; t: T }) {
  const [open, setOpen] = useState(initial.trim().length > 0);
  const [text, setText] = useState(initial);
  const [seed, setSeed] = useState(initial);
  if (initial !== seed) {
    // le texte de départ arrive (conversation chargée) : on l'adopte s'il n'a pas été modifié à la main
    setSeed(initial);
    if (!text.trim()) {
      setText(initial);
      setOpen(initial.trim().length > 0);
    }
  }
  const priced = (specs: Parameters<typeof toLine>[0][]) => specs.map((s) => { const l = toLine(s); return { ...l, unit: salePrice(l, settings) }; });
  return (
    <section className="card !p-0" aria-labelledby="h-intake-pro">
      <h2 id="h-intake-pro" className="m-0">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left hover:bg-surface-2/60 sm:px-6">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary"><Wand2 size={18} /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t("intake.pro.title")}</span>
            <span className="block text-sm font-normal text-muted">{t("intake.pro.hint")}</span>
          </span>
          <ChevronDown size={18} aria-hidden className={`shrink-0 text-muted transition-transform ${open ? "" : "-rotate-90"}`} />
        </button>
      </h2>
      {open && (
        <div className="space-y-3 border-t border-line p-4 sm:p-6">
          <label htmlFor="intake-text" className="sr-only">{t("intake.pro.title")}</label>
          <textarea id="intake-text" className="input min-h-28" maxLength={4000} placeholder={t("req.messagePh")} value={text} onChange={(e) => setText(e.target.value)} />
          <IntakeAssistant
            text={text}
            t={t}
            price={(it) => salePrice(toLine(it.spec), settings)}
            actions={(items) => (
              <>
                <button type="button" className="btn-primary !min-h-10" onClick={() => onAdd(priced(items.map((i) => i.spec)))}>{t("intake.pro.addLines")}</button>
                <button type="button" className="btn-secondary !min-h-10" onClick={() => onReplace(priced(items.map((i) => i.spec)))}>{t("intake.pro.replaceLines")}</button>
              </>
            )}
          />
        </div>
      )}
    </section>
  );
}
