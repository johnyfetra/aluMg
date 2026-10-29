"use client";
import { FinishSwatch } from "./Swatch";
import { Box, ChevronDown, MessageSquare, PencilRuler } from "lucide-react";
import { useState } from "react";
import InfoTip from "./InfoTip";
import LineComments from "./LineComments";
import LineDecision, { type ReviewBody } from "./LineDecision";
import Viewer3DLoader from "./Viewer3DLoader";
import { fmt, lineTotal } from "@/lib/calc";
import { useLineComments } from "@/lib/client";
import { lineDetails, lineTitle } from "@/lib/describe";
import { drawingSvg } from "@/lib/drawing";
import { useI18n } from "@/lib/i18n";
import { FINISHES, type Line, type LineReview, hasLeafConfig, leafMarks, leafModes } from "@/lib/model";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Un ouvrage vu par le client : résumé, puis détail complet (plan, vue 3D, caractéristiques) et fil de commentaires.
// `focused` : ouvrage visé par une notification (déplié, mis en évidence).
export default function ClientLineCard({ quoteId, line: l, index, mark, priced, focused, canComment, review, canReview, busy, onReview }: { quoteId: string; line: Line; index: number; mark: string; priced: boolean; focused: boolean; canComment: boolean; review?: LineReview; canReview: boolean; busy: boolean; onReview: (b: ReviewBody) => Promise<boolean> }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(focused);
  const [view, setView] = useState<"2d" | "3d">("2d");
  const { data: all = [] } = useLineComments(quoteId);
  const count = all.filter((c) => c.lineId === l.id).length;
  const cur = t("common.currency");
  const finish = FINISHES.find((f) => f.id === l.finish);
  const marks = hasLeafConfig(l) ? leafMarks(l) : [];
  const modes = hasLeafConfig(l) ? leafModes(l) : [];
  const modeLabel = (m: string) => t(m === "F" ? "leaf.F" : m === "B" ? "leaf.B" : l.opening === "coulissant" ? (m === "L" ? "leaf.slideL" : "leaf.slideR") : m === "L" ? "leaf.hingeL" : "leaf.hingeR");

  return (
    <li id={`line-${l.id}`} className={`scroll-mt-24 rounded-2xl border bg-surface ${focused ? "border-primary ring-2 ring-primary/40" : "border-line"}`}>
      <div className="grid gap-4 p-4 sm:grid-cols-[10rem_1fr_auto] sm:p-5">
        <div role="img" aria-label={lineTitle(l, t)} className="rounded-xl bg-white p-2 [&>svg]:mx-auto [&>svg]:max-h-40" dangerouslySetInnerHTML={{ __html: drawingSvg(l, `c${index}`, 220, 160).svg }} />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">{mark}{l.room ? <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 normal-case tracking-normal text-ink">{l.room}</span> : null}</p>
          <p className="text-lg font-semibold leading-snug">{cap(lineTitle(l, t))}</p>
          <p className="text-sm text-muted">
            {l.width} × {l.height} {t("common.mm")} · ×{l.qty}
          </p>
          {l.note && <p className="mt-1 text-sm italic text-muted">« {l.note} »</p>}
          <ul className="mt-1.5 space-y-0.5 text-sm text-muted">
            {lineDetails(l, t).slice(0, 2).map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
        {priced && (
          <div className="text-left text-sm sm:text-right">
            <p className="text-muted">
              {fmt(l.unit)} {cur} × {l.qty}
            </p>
            <p className="text-xl font-bold">
              {fmt(lineTotal(l))} {cur}
            </p>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-2.5 sm:px-5">
        <button type="button" aria-expanded={open} aria-controls={`${l.id}-detail`} onClick={() => setOpen((o) => !o)} className="btn-secondary !min-h-9 !px-3 text-xs">
          <ChevronDown size={15} aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`} />
          {open ? t("cl.hideDetails") : t("cl.details")}
        </button>
        {canComment && (
          <button type="button" onClick={() => setOpen(true)} className="btn-secondary !min-h-9 !px-3 text-xs">
            <MessageSquare size={15} aria-hidden />
            {t("cmt.title")}
            {count > 0 && <span className="rounded-full bg-primary px-1.5 text-[11px] font-bold text-on-primary">{count}</span>}
          </button>
        )}
      </div>
      {priced && (review || canReview) && <LineDecision review={review} canReview={canReview} busy={busy} onReview={onReview} t={t} />}
      {open && (
        <div id={`${l.id}-detail`} className="space-y-5 border-t border-line p-4 sm:p-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="space-y-2">
              <div role="group" aria-label={t("cl.details")} className="inline-flex gap-0.5 rounded-full border border-line bg-surface p-0.5">
                {([["2d", PencilRuler, "cl.view2d"], ["3d", Box, "cl.view3d"]] as const).map(([k, Icon, label]) => (
                  <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)} className={`flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${view === k ? "bg-primary text-on-primary" : "text-muted hover:text-ink"}`}>
                    <Icon size={14} aria-hidden />
                    {t(label)}
                  </button>
                ))}
              </div>
              {view === "3d" ? (
                <Viewer3DLoader line={l} />
              ) : (
                <div role="img" aria-label={lineTitle(l, t)} className="rounded-xl border border-line bg-white p-3 [&>svg]:mx-auto [&>svg]:h-auto [&>svg]:max-h-[22rem]" dangerouslySetInnerHTML={{ __html: drawingSvg(l, `d${index}`, 420, 340).svg }} />
              )}
            </div>
            <div className="space-y-4">
              <section aria-label={t("cl.specs")}>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold"><span aria-hidden className="h-4 w-1 rounded-full bg-primary" />{t("cl.specs")}</h4>
                <dl className="divide-y divide-line rounded-xl border border-line text-sm">
                  {(l.category === "fenetre" || l.category === "porte") && (
                    <div className="flex justify-between gap-4 px-3 py-2">
                      <dt className="text-muted">{t("editor.opening")}<InfoTip term="opening" /></dt>
                      <dd className="font-medium">{cap(t(`opening.${l.opening}`))}</dd>
                    </div>
                  )}
                  {(l.category === "fenetre" || l.category === "porte" || l.category === "cloison") && l.leaves > 1 && (
                    <div className="flex justify-between gap-4 px-3 py-2">
                      <dt className="text-muted">{t(l.category === "cloison" ? "editor.panels" : "editor.leaves")}<InfoTip term="leaves" /></dt>
                      <dd className="font-medium tabular-nums">{l.leaves}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-4 px-3 py-2">
                    <dt className="text-muted">{t("cl.dimensions")}<InfoTip term="dims" /></dt>
                    <dd className="font-medium tabular-nums">{l.width} × {l.height} {t("common.mm")}</dd>
                  </div>
                  <div className="flex justify-between gap-4 px-3 py-2">
                    <dt className="text-muted">{t("editor.finish")}<InfoTip term="finish" /></dt>
                    <dd className="inline-flex items-center gap-2 font-medium">
                      <FinishSwatch id={finish?.id ?? "blanc"} size={16} />
                      {finish ? t(finish.label) : l.finish}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 px-3 py-2">
                    <dt className="text-muted">{t("editor.range")}<InfoTip term="range" /></dt>
                    <dd className="font-medium">{t(`range.${l.range}`)}</dd>
                  </div>
                  {lineDetails(l, t).slice(1).map((d) => (
                    <div key={d} className="px-3 py-2">
                      <dd>{d}</dd>
                    </div>
                  ))}
                  {marks.length > 0 && (
                    <div className="px-3 py-2">
                      <dt className="mb-1 text-muted">{t("editor.leafConfig")}<InfoTip term="leafCfg" /></dt>
                      <dd>
                        <ul className="flex flex-wrap gap-1.5">
                          {marks.map((m, i) => (
                            <li key={m} className="rounded-md bg-surface-2 px-2 py-0.5 text-xs">
                              <span className="font-bold tabular-nums">{m}</span> · {modeLabel(modes[i])}
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            </div>
          </div>
          {canComment && <LineComments quoteId={quoteId} lineId={l.id} me="client" />}
        </div>
      )}
    </li>
  );
}
