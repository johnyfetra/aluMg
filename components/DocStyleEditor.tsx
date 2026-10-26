"use client";
import { CheckCircle2, Lock, TriangleAlert } from "lucide-react";
import { useMemo } from "react";
import QuotePaper from "./QuotePaper";
import { Choice, Field } from "./ui";
import { missingMentions, presetOf, sampleQuote } from "@/lib/docStyle";
import { type Locale, type T } from "@/lib/i18n";
import { DOC_DENSITIES, DOC_FONTS, DOC_HEADERS, DOC_PRESETS, DOC_TABLES, type DocPreset, type DocStyle, type Issuer } from "@/lib/model";
import type { Messages } from "@/lib/messages/fr";

// Mini-schéma d'un modèle : trait d'en-tête + lignes de tableau, dessinés en CSS.
function Thumb({ p }: { p: DocStyle }) {
  const head = p.header === "banner" ? <div className="h-3 rounded-sm bg-primary" /> : <div className="h-1 rounded-sm bg-primary" />;
  const row = (i: number) => (
    <div key={i} className={`h-2 ${p.table === "boxed" ? "border border-slate-300" : p.table === "lines" ? "border-b border-slate-300" : i % 2 ? "bg-slate-100" : ""}`} />
  );
  return (
    <div aria-hidden className="space-y-1.5 rounded-md bg-white p-2 ring-1 ring-black/10">
      {head}
      <div className={`flex gap-1 ${p.header === "center" ? "flex-col items-center" : "justify-between"}`}>
        <div className="h-2 w-8 rounded-sm bg-slate-300" />
        <div className="h-2 w-6 rounded-sm bg-slate-200" />
      </div>
      <div className={p.table === "zebra" ? "h-2 rounded-sm bg-primary" : p.table === "boxed" ? "h-2 rounded-sm bg-primary" : "h-2 border-b-2 border-primary"} />
      {[0, 1, 2].map(row)}
    </div>
  );
}

// Modèles de devis : galerie, personnalisation cadrée (mise en page et style seulement), contrôle des mentions obligatoires et aperçu en direct.
export default function DocStyleEditor({ value, onChange, issuer, t, locale }: { value: DocStyle; onChange: (v: DocStyle) => void; issuer: Issuer; t: T; locale: Locale }) {
  const current = presetOf(value);
  const missing = missingMentions(issuer);
  const quote = useMemo(() => sampleQuote(), []);
  const set = (patch: Partial<DocStyle>) => onChange({ ...value, ...patch });
  const names = Object.keys(DOC_PRESETS) as DocPreset[];

  return (
    <div className="space-y-5">
      <div role="status" className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${missing.length ? "border-warn/50 bg-warn/10" : "border-ok/40 bg-ok/10"}`}>
        {missing.length ? <TriangleAlert size={18} aria-hidden className="mt-0.5 shrink-0 text-warn" /> : <CheckCircle2 size={18} aria-hidden className="mt-0.5 shrink-0 text-ok" />}
        <p>{missing.length ? `${t("doc.missing")} ${missing.map((k) => t(`doc.f.${k}` as keyof Messages)).join(", ")}.` : t("doc.compliant")}</p>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("doc.templates")}</legend>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {names.map((k) => (
            <label key={k} className="cursor-pointer">
              <input type="radio" name="doc-template" className="peer sr-only" checked={current === k} onChange={() => onChange({ ...DOC_PRESETS[k], footer: value.footer })} />
              <span className="flex h-full flex-col gap-2 rounded-xl border border-line bg-surface p-3 peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-primary">
                <Thumb p={DOC_PRESETS[k]} />
                <span className="text-sm font-semibold">{t(`doc.tpl.${k}` as keyof Messages)}</span>
                <span className="text-xs text-muted">{t(`doc.tpl.${k}.d` as keyof Messages)}</span>
              </span>
            </label>
          ))}
          <div aria-current={current === "custom" ? "true" : undefined} className={`flex flex-col justify-center gap-1 rounded-xl border border-dashed p-3 ${current === "custom" ? "border-primary text-ink" : "border-line text-muted"}`}>
            <span className="text-sm font-semibold">{t("doc.tpl.custom")}</span>
            <span className="text-xs">{t("doc.customize")} ↓</span>
          </div>
        </div>
      </fieldset>

      <div className="grid gap-4 lg:grid-cols-2">
        <Choice dense name="doc-header" legend={t("doc.header")} value={value.header} options={DOC_HEADERS.map((h) => ({ value: h, label: t(`doc.header.${h}` as keyof Messages) }))} onChange={(header) => set({ header })} />
        <Choice dense name="doc-table" legend={t("doc.table")} value={value.table} options={DOC_TABLES.map((x) => ({ value: x, label: t(`doc.table.${x}` as keyof Messages) }))} onChange={(table) => set({ table })} />
        <Choice dense name="doc-font" legend={t("doc.font")} value={value.font} options={DOC_FONTS.map((x) => ({ value: x, label: t(`doc.font.${x}` as keyof Messages) }))} onChange={(font) => set({ font })} />
        <Choice dense name="doc-density" legend={t("doc.density")} value={value.density} options={DOC_DENSITIES.map((x) => ({ value: x, label: t(`doc.density.${x}` as keyof Messages) }))} onChange={(density) => set({ density })} />
      </div>
      <label className="flex min-h-10 items-center gap-2 text-sm">
        <input type="checkbox" className="size-4" checked={value.drawings} onChange={(e) => set({ drawings: e.target.checked })} />
        {t("doc.drawings")}
      </label>
      <Field htmlFor="doc-footer" label={t("doc.footer")} hint={t("doc.footerHint")}>
        <textarea id="doc-footer" className="input min-h-20" maxLength={300} value={value.footer} onChange={(e) => set({ footer: e.target.value })} />
      </Field>

      <div className="rounded-lg border border-line bg-surface-2/40 p-3">
        <p className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Lock size={14} aria-hidden className="text-muted" />
          {t("doc.locked")}
        </p>
        <p className="text-xs leading-relaxed text-muted">{t("doc.lockedItems")}</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">{t("doc.preview")}</p>
        <div className="relative h-[26rem] overflow-hidden rounded-xl border border-line bg-slate-100 sm:h-[34rem]" aria-hidden>
          <div className="pointer-events-none origin-top-left" style={{ width: "200%", transform: "scale(0.5)" }}>
            <QuotePaper q={quote} s={{ ...issuer, docStyle: value }} t={t} locale={locale} />
          </div>
        </div>
      </div>
    </div>
  );
}
