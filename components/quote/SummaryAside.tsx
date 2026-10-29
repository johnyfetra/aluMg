"use client";
import { Copy, Eye, FileDown, Ruler, Save, Send, XCircle } from "lucide-react";
import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import Calibration from "../Calibration";
import Select from "../Select";
import { Field } from "../ui";
import { fmt, meters, type planTotals } from "@/lib/calc";
import type { quoteMargin } from "@/lib/costing";
import { presetOf } from "@/lib/docStyle";
import type { T } from "@/lib/i18n";
import type { Messages } from "@/lib/messages/fr";
import { DOC_PRESETS, type DocPreset, type EditMode, type Quote, type Settings } from "@/lib/model";

type Props = {
  t: T;
  q: Quote;
  setQ: Dispatch<SetStateAction<Quote>>;
  totals: { discount: number; ht: number; tva: number; ttc: number };
  margin: ReturnType<typeof quoteMargin> | null;
  plan: ReturnType<typeof planTotals>;
  persisted: boolean;
  canAct: boolean;
  locked: boolean;
  revisable: boolean;
  mode: EditMode;
  note: string;
  setNote: (v: string) => void;
  attachCut: boolean;
  setAttachCut: (v: boolean) => void;
  msg: { ok: boolean; text: string } | null;
  settings: Settings;
  onNeeds: () => void;
  onAct: (type: "send" | "decline") => void;
  onSubmit: (withPdf: boolean) => void;
  onNewVersion: () => void;
};

// Colonne de synthèse de l'éditeur : totaux, besoin en profilés, envoi au client, modèle du devis, PDF et enregistrement.
// Elle reste visible pendant la saisie sur grand écran.
export default function SummaryAside({ t, q, setQ, totals, margin, plan, persisted, canAct, locked, revisable, mode, note, setNote, attachCut, setAttachCut, msg, settings, onNeeds, onAct, onSubmit, onNewVersion }: Props) {
  const num = (v: string) => Number(v) || 0;
  return (
    <aside className="space-y-3 xl:sticky xl:top-32" aria-label="Total">
          <section className="card space-y-2 !p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted">{t("editor.totalTtc")}</p>
                <p className="text-2xl font-bold leading-tight tabular-nums text-primary">{fmt(totals.ttc)} <span className="text-sm font-semibold">{t("common.currency")}</span></p>
              </div>
              {persisted && (
                <Link href={`/devis/${q.id}/apercu`} className="btn-secondary !min-h-8 !px-2.5 text-xs">
                  <Eye size={14} aria-hidden />
                  {t("preview.open")}
                </Link>
              )}
            </div>
            <dl className="space-y-1 border-t border-line pt-2 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <dt>
                  <label htmlFor="q-disc" className="text-muted">{t("editor.discount")}</label>
                </dt>
                <dd className="flex items-center gap-2 tabular-nums">
                  {totals.discount > 0 && <span className="text-muted">− {fmt(totals.discount)}</span>}
                  <input id="q-disc" type="number" inputMode="decimal" min={0} max={100} className="input !min-h-7 !w-16 !px-2 !py-0.5 text-right text-[13px]" value={q.discount || ""} placeholder="0" onChange={(e) => setQ({ ...q, discount: Math.min(100, Math.max(0, num(e.target.value))) })} />
                </dd>
              </div>
              <div className="flex justify-between"><dt className="text-muted">{t("editor.totalHt")}</dt><dd className="tabular-nums">{fmt(totals.ht)} {t("common.currency")}</dd></div>
              {q.terms.tva > 0 && <div className="flex justify-between"><dt className="text-muted">{t("editor.totalTva")} {q.terms.tva} %</dt><dd className="tabular-nums">{fmt(totals.tva)} {t("common.currency")}</dd></div>}
            </dl>
          </section>

          {margin && (
            <section className="card space-y-1 !p-3.5 text-[13px]" aria-label={t("editor.marginLine")}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold">{t("editor.marginLine")}</p>
                <p className={`font-bold tabular-nums ${margin.margin < 0 ? "text-danger" : margin.pct < settings.minMarginPct ? "text-warn" : "text-ok"}`}>{fmt(margin.margin)} {t("common.currency")} · {margin.pct} %</p>
              </div>
              <p className="text-xs text-muted">{margin.ofSale} {t("budget.ofSale")}</p>
              {margin.margin < 0 ? <p role="alert" className="text-xs font-medium text-danger">{t("editor.marginLoss")}</p> : margin.pct < settings.minMarginPct && <p className="text-xs font-medium text-warn">{t("editor.marginLow")}</p>}
              {margin.servicesUnknown && <p className="text-xs text-warn">{t("budget.servicesUnknown")}</p>}
            </section>
          )}

          {canAct && <Calibration settings={settings} t={t} />}

          <section className="card flex items-center justify-between gap-3 !p-3.5 text-[13px]" aria-label={t("editor.materials")}>
            <div className="min-w-0">
              <p className="font-semibold">{t("editor.materials")}</p>
              <p className="text-muted tabular-nums">{plan.bars} {t("needs.barsShort")} · {meters(plan.usedLen)}<br />{t("needs.wasteShort")} {plan.wastePct} %</p>
            </div>
            <button type="button" className="btn-secondary !min-h-8 !px-2.5 text-xs" onClick={onNeeds}>
              <Ruler size={14} aria-hidden />
              {t("needsPage.openShort")}
            </button>
          </section>

          {canAct && (
            <section className="card space-y-2 border-primary/50 !p-3.5" aria-labelledby="h-act">
              <h3 id="h-act" className="text-sm font-semibold">{t("editor.sendClient")}</h3>
              <label className="sr-only" htmlFor="q-note">{t("editor.noteToClient")}</label>
              <textarea id="q-note" rows={2} className="input min-h-14 text-[13px]" placeholder={t("editor.noteToClient")} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="flex gap-2">
                <button type="button" className="btn-primary flex-1" onClick={() => onAct("send")}>
                  <Send size={15} aria-hidden />
                  {q.status === "rejected" ? t("editor.resend") : t("editor.sendShort")}
                </button>
                {q.clientId && q.status !== "negotiation" && q.status !== "rejected" && (
                  <button type="button" className="btn-danger !px-3" onClick={() => onAct("decline")} aria-label={t("editor.decline")} title={t("editor.decline")}>
                    <XCircle size={15} aria-hidden />
                  </button>
                )}
              </div>
            </section>
          )}

          <section className="card space-y-2.5 !p-3.5">
            <Field htmlFor="q-design" label={t("editor.pdfDesign")}>
              <Select
                id="q-design"
                value={q.docStyle ? presetOf(q.docStyle) : ""}
                onChange={(v) => setQ((c) => ({ ...c, docStyle: v && v in DOC_PRESETS ? { ...DOC_PRESETS[v as DocPreset], footer: settings.docStyle.footer } : undefined }))}
                options={[{ value: "", label: t("editor.pdfDesignDefault") }, ...(Object.keys(DOC_PRESETS) as DocPreset[]).map((k) => ({ value: k, label: t(`doc.tpl.${k}` as keyof Messages) }))]}
              />
            </Field>
            <label className="flex min-h-8 items-center gap-2 text-[13px]">
              <input type="checkbox" className="size-4" checked={attachCut} onChange={(e) => setAttachCut(e.target.checked)} />
              {t("editor.attachCut")}
            </label>
            <div className="grid gap-2">
              <button type="button" className="btn-primary" onClick={() => onSubmit(true)}>
                <FileDown size={16} aria-hidden />
                {locked ? t("editor.pdfOnly") : t("editor.savePdf")}
              </button>
              {locked && !q.clientId && (
                <button type="button" className="btn-secondary" onClick={onNewVersion}>
                  <Copy size={16} aria-hidden />
                  {t("editor.newVersion")}
                </button>
              )}
              {!locked && (
                <button type="button" className="btn-secondary" onClick={() => onSubmit(false)}>
                  <Save size={16} aria-hidden />
                  {mode === "reconfirm" ? t("editor.saveReconfirm") : revisable ? t("editor.saveRevision") : mode === "negotiate" || mode === "reopen" ? t("editor.saveChanges") : t("editor.saveDraft")}
                </button>
              )}
            </div>
            <p role="status" className={`text-[13px] font-medium ${msg?.ok ? "text-ok" : "text-danger"}`}>
              {msg?.text}
            </p>
          </section>
        </aside>
  );
}
