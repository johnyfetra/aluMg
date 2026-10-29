"use client";
import { CircleHelp, Sparkles, TriangleAlert } from "lucide-react";
import { useMemo } from "react";
import { analyze, type IntakeItem, questions, toLine } from "@/lib/intake";
import { FINISHES } from "@/lib/model";
import { lineTitle } from "@/lib/describe";
import type { T } from "@/lib/i18n";

// Ce que l'application a compris d'une description libre : ouvrages détectés (avec ce qui a été supposé), questions pour lever les doutes,
// et les actions pour les utiliser. Sert au client (sa demande) comme au menuisier (créer les ouvrages d'un devis depuis un texte).
export default function IntakeAssistant({ text, t, actions, price }: { text: string; t: T; actions: (items: IntakeItem[]) => React.ReactNode; price?: (item: IntakeItem) => number }) {
  const result = useMemo(() => analyze(text), [text]);
  const qs = questions(result);
  if (!text.trim()) return null;
  return (
    <section aria-live="polite" aria-labelledby="h-intake" className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <h3 id="h-intake" className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles size={16} aria-hidden className="text-primary" />
        {t("intake.understood")}
        {result.items.length > 0 && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">{result.items.length}</span>}
      </h3>

      {result.items.length === 0 ? (
        <p className="text-sm text-muted">{t("intake.none")}</p>
      ) : (
        <ul className="space-y-2">
          {result.items.map((it, i) => {
            const l = toLine(it.spec);
            return (
              <li key={i} className="rounded-xl border border-line bg-surface p-3">
                <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                  <p className="min-w-0 flex-1 font-semibold leading-snug">
                    {it.spec.qty && it.spec.qty > 1 ? `${it.spec.qty} × ` : ""}
                    {lineTitle(l, t)}
                  </p>
                  {price && <p className="whitespace-nowrap text-sm font-bold tabular-nums">{new Intl.NumberFormat("fr-FR").format(price(it) * (it.spec.qty ?? 1))} {t("common.currency")}</p>}
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
                  <span className={it.assumptions.includes("size") ? "text-warn" : ""}>{l.width} × {l.height} mm</span>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1.5"><span aria-hidden className="size-3 rounded-full border border-line" style={{ background: FINISHES.find((f) => f.id === l.finish)?.hex }} />{t(`finish.${l.finish}`)}</span>
                  {it.spec.room && <><span aria-hidden>·</span><span>{it.spec.room}</span></>}
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
            {qs.map((q, i) => <li key={i}>{q.key === "empty" ? t("intake.q.empty") : `${t(`intake.q.${q.key}` as "intake.q.size")} — ${lineTitle(toLine(result.items[q.item].spec), t)}`}</li>)}
          </ul>
        </div>
      )}
      {result.items.length > 0 && <div className="flex flex-wrap gap-2">{actions(result.items)}</div>}
    </section>
  );
}
