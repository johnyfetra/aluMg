"use client";
import { CircleHelp, Minus, Plus, Sparkles, TriangleAlert, X } from "lucide-react";
import { type ReactNode, useDeferredValue, useMemo, useState } from "react";
import { FinishSwatch } from "./Swatch";
import { lineTitle } from "@/lib/describe";
import type { T } from "@/lib/i18n";
import { analyze, type IntakeItem, questions, toLine } from "@/lib/intake";

// Ce que l'application a compris d'une description libre : ouvrages détectés (avec ce qui a été supposé), questions pour lever les doutes,
// et les actions pour les utiliser. Le client peut retirer un ouvrage mal compris ou corriger sa quantité avant de l'utiliser.
// Sert au client (sa demande) comme au menuisier (créer les ouvrages d'un devis depuis un texte).
export default function IntakeAssistant({ text, t, actions, price, onEdit }: { text: string; t: T; actions: (items: IntakeItem[]) => ReactNode; price?: (item: IntakeItem) => number; onEdit?: (items: IntakeItem[]) => void }) {
  // l'analyse suit la frappe sans la ralentir : elle travaille sur la valeur différée
  const deferred = useDeferredValue(text);
  const result = useMemo(() => analyze(deferred), [deferred]);
  const lines = useMemo(() => result.items.map((i) => toLine(i.spec)), [result]);
  const key = result.items.map((i) => i.text).join("¦");
  // retraits et quantités corrigés à la main : valables tant que l'analyse donne les mêmes ouvrages
  const [adj, setAdj] = useState<{ key: string; qty: Record<number, number>; off: number[] }>({ key: "", qty: {}, off: [] });
  const cur = adj.key === key ? adj : { key, qty: {}, off: [] };
  const keep = (a: typeof cur) => result.items.flatMap((it, i) => (a.off.includes(i) ? [] : [{ i, it: a.qty[i] ? { ...it, spec: { ...it.spec, qty: a.qty[i] } } : it }]));
  const kept = keep(cur);
  const items = kept.map((k) => k.it);
  // une correction à la main est signalée au parent (la demande ne repart pas du texte brut)
  const commit = (next: typeof cur) => {
    setAdj(next);
    onEdit?.(keep(next).map((k) => k.it));
  };
  const qs = questions({ ...result, items });
  if (!text.trim()) return null;
  const setQty = (i: number, q: number) => commit({ ...cur, qty: { ...cur.qty, [i]: Math.min(99, Math.max(1, q)) } });

  return (
    <section aria-live="polite" aria-labelledby="h-intake" className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <h3 id="h-intake" className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles size={16} aria-hidden className="text-primary" />
        {t("intake.understood")}
        {items.length > 0 && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">{items.length}</span>}
      </h3>

      {items.length === 0 ? (
        <p className="text-sm text-muted">{cur.off.length ? t("intake.allRemoved") : t("intake.none")}</p>
      ) : (
        <ul className="space-y-2">
          {kept.map(({ i, it }) => {
            const l = lines[i];
            const qty = it.spec.qty ?? 1;
            return (
              <li key={`${i}-${it.text}`} className="rounded-xl border border-line bg-surface p-3">
                <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                  <p className="min-w-0 flex-1 font-semibold leading-snug">{lineTitle(l, t)}</p>
                  <div className="flex items-center gap-1" role="group" aria-label={t("editor.qty")}>
                    <button type="button" onClick={() => setQty(i, qty - 1)} disabled={qty <= 1} aria-label={`${t("editor.qty")} −`} className="grid size-8 place-items-center rounded-lg border border-line text-muted hover:bg-surface-2 disabled:opacity-40"><Minus size={14} aria-hidden /></button>
                    <span className="min-w-8 text-center text-sm font-bold tabular-nums">× {qty}</span>
                    <button type="button" onClick={() => setQty(i, qty + 1)} aria-label={`${t("editor.qty")} +`} className="grid size-8 place-items-center rounded-lg border border-line text-muted hover:bg-surface-2"><Plus size={14} aria-hidden /></button>
                    <button type="button" onClick={() => commit({ ...cur, off: [...cur.off, i] })} aria-label={`${t("intake.remove")} — ${lineTitle(l, t)}`} title={t("intake.remove")} className="ml-1 grid size-8 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger"><X size={15} aria-hidden /></button>
                  </div>
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted">
                  <span className={it.assumptions.includes("size") ? "text-warn" : ""}>{l.width} × {l.height} mm</span>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1.5"><FinishSwatch id={l.finish} size={16} />{t(`finish.${l.finish}`)}</span>
                  {it.spec.range && <><span aria-hidden>·</span><span>{t(`range.${it.spec.range}`)}</span></>}
                  {it.spec.thickness && <><span aria-hidden>·</span><span>{t(`thickness.${it.spec.thickness}`)}</span></>}
                  {it.spec.room && <><span aria-hidden>·</span><span>{it.spec.room}</span></>}
                  {price && <span className="ml-auto font-bold tabular-nums text-ink">{new Intl.NumberFormat("fr-FR").format(price({ ...it, spec: { ...it.spec } }) * qty)} {t("common.currency")}</span>}
                </p>
                {it.assumptions.length > 0 && (
                  <p className="mt-1.5 flex flex-wrap gap-1.5">
                    {it.assumptions.map((k) => <span key={k} className="inline-flex items-center gap-1 rounded-full bg-warn/10 px-2 py-0.5 text-[11px] font-semibold text-warn"><TriangleAlert size={11} aria-hidden />{t(`intake.as.${k}`)}</span>)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {result.unsupported.length > 0 && <p className="text-xs text-muted">{t("intake.unsupported")} : {result.unsupported.join(", ")}.</p>}
      {result.urgent && <p className="text-xs font-semibold text-warn">{t("intake.urgent")}</p>}

      {qs.length > 0 && (
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold"><CircleHelp size={14} aria-hidden className="text-primary" />{t("intake.questions")}</p>
          <ul className="list-disc space-y-0.5 pl-5 text-[13px] text-muted">
            {qs.map((q, n) => <li key={n}>{q.key === "empty" ? t("intake.q.empty") : `${t(`intake.q.${q.key}` as "intake.q.size")} — ${lineTitle(toLine(items[q.item].spec), t)}`}</li>)}
          </ul>
        </div>
      )}
      {items.length > 0 && <div className="flex flex-wrap gap-2">{actions(items)}</div>}
    </section>
  );
}
