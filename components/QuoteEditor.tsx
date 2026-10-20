"use client";
import { Copy, FileDown, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ProfileNeeds from "./ProfileNeeds";
import { Choice, Field, FinishPicker } from "./ui";
import { allPieces, billedArea, cutList, cuttingPlan, fmt, lineTotal, meters, normalize, planTotals, unitPrice } from "@/lib/calc";
import { useQuotes, useSettings } from "@/lib/client";
import { lineTitle } from "@/lib/describe";
import { drawingSvg } from "@/lib/drawing";
import { type T, useI18n } from "@/lib/i18n";
import {
  CATEGORIES,
  CONTROLS,
  EXTRAS,
  GLASSES,
  GUARDS,
  INFILLS,
  type Category,
  type Line,
  OPENINGS_BY_CATEGORY,
  PATTERNS,
  PATTERN_GLASSES,
  RANGES,
  SHUTTERS,
  THICKNESSES,
  type Quote,
  type Settings,
  leavesSpec,
  lineSchema,
} from "@/lib/model";
import { totals } from "@/lib/totals";

const DEFAULT_SIZE: Record<Category, [number, number]> = {
  fenetre: [1200, 1000],
  porte: [900, 2100],
  volet: [1200, 1500],
  "garde-corps": [2000, 1000],
  cloison: [2400, 2400],
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const price = (l: Line, s: Settings) => unitPrice(l, s.tariffs, s.surcharges, s.minArea);

function newLine(s: Settings): Line {
  const base: Line = {
    id: crypto.randomUUID(),
    category: "fenetre",
    opening: "coulissant",
    leaves: 2,
    shutter: "roulant",
    control: "manuel",
    guard: "barreaudage",
    range: "asiatique",
    finish: "blanc",
    infill: "vitree",
    glassType: "clair",
    thickness: "5",
    pattern: "none",
    extras: [],
    width: DEFAULT_SIZE.fenetre[0],
    height: DEFAULT_SIZE.fenetre[1],
    qty: 1,
    unit: 0,
  };
  return { ...base, unit: price(base, s) };
}

export default function QuoteEditor({ id }: { id?: string }) {
  const { t } = useI18n();
  const { quotes, loading } = useQuotes();
  const { settings } = useSettings();
  if (loading || !settings || !quotes) return null;
  const existing = id ? quotes.find((q) => q.id === id) : undefined;
  if (id && !existing) {
    return (
      <p className="card">
        {t("editor.notFound")}{" "}
        <Link href="/devis" className="text-primary underline">
          {t("common.back")}
        </Link>
      </p>
    );
  }
  return <Form key={id ?? "new"} existing={existing} settings={settings} />;
}

function Form({ existing, settings }: { existing?: Quote; settings: Settings }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { save } = useQuotes();
  const [attachCut, setAttachCut] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [persisted, setPersisted] = useState(!!existing);
  const [q, setQ] = useState<Quote>(
    () =>
      existing ?? {
        id: crypto.randomUUID(),
        number: "",
        date: new Date().toISOString(),
        status: "draft",
        client: { name: "", phone: "", address: "" },
        project: "",
        delay: "",
        notes: "",
        lines: [newLine(settings)],
        terms: { tva: settings.tva, deposit: settings.deposit, validityDays: settings.validityDays },
      },
  );

  const setLine = (i: number, patch: Partial<Line>) =>
    setQ((cur) => ({
      ...cur,
      lines: cur.lines.map((l, j) => {
        if (j !== i) return l;
        const sizeReset = patch.category && patch.category !== l.category ? { width: DEFAULT_SIZE[patch.category][0], height: DEFAULT_SIZE[patch.category][1], leaves: patch.category === "cloison" ? 3 : 2 } : {};
        const next = normalize({ ...l, ...sizeReset, ...patch });
        // le prix suit la configuration, sauf si le menuisier vient de le fixer à la main
        return "unit" in patch ? next : { ...next, unit: price(next, settings) };
      }),
    }));
  const setClient = (patch: Partial<Quote["client"]>) => setQ((c) => ({ ...c, client: { ...c.client, ...patch } }));
  const num = (v: string) => Number(v) || 0;

  const valid = (l: Line) => lineSchema.safeParse(l).success;
  const validLines = q.lines.filter(valid);
  const { ht, tva, ttc } = totals({ lines: validLines, terms: q.terms });
  const plan = planTotals(cuttingPlan(allPieces(validLines), settings.barLength, settings.kerf));

  const submit = async (withPdf: boolean) => {
    if (validLines.length !== q.lines.length || q.lines.length === 0) {
      setMsg({ ok: false, text: t("editor.needLine") });
      return;
    }
    try {
      const saved = await save(q, !persisted);
      setPersisted(true);
      setQ(saved);
      setMsg({ ok: true, text: t("editor.saved") });
      if (withPdf) {
        const { quotePdf } = await import("@/lib/pdf");
        await quotePdf(saved, settings, t, locale, attachCut);
      }
      if (!existing) router.replace(`/devis/${saved.id}`);
    } catch (e) {
      console.error("[alumg] enregistrement ou PDF en échec", e);
      setMsg({ ok: false, text: t("common.error") });
    }
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{q.number ? `${t("editor.titleEdit")} ${q.number}` : t("editor.titleNew")}</h1>
        <Link href="/devis" className="btn-secondary">
          {t("common.back")}
        </Link>
      </div>

      {!settings.company && (
        <p className="card border-warn text-sm" role="note">
          {t("editor.setupHint")}{" "}
          <Link href="/reglages" className="font-semibold text-primary underline">
            {t("editor.setupLink")}
          </Link>
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <section className="card space-y-4" aria-labelledby="h-client">
            <h2 id="h-client" className="text-lg font-semibold">
              {t("editor.client")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field htmlFor="cn" label={t("editor.clientName")}>
                <input id="cn" className="input" autoComplete="name" maxLength={120} value={q.client.name} onChange={(e) => setClient({ name: e.target.value })} />
              </Field>
              <Field htmlFor="cp" label={t("editor.clientPhone")}>
                <input id="cp" className="input" type="tel" autoComplete="tel" maxLength={40} value={q.client.phone} onChange={(e) => setClient({ phone: e.target.value })} />
              </Field>
              <Field htmlFor="ca" label={t("editor.clientAddress")}>
                <input id="ca" className="input" maxLength={200} value={q.client.address} onChange={(e) => setClient({ address: e.target.value })} />
              </Field>
              <Field htmlFor="pj" label={t("editor.project")}>
                <input id="pj" className="input" maxLength={200} value={q.project} onChange={(e) => setQ({ ...q, project: e.target.value })} />
              </Field>
              <Field htmlFor="dl" label={t("editor.delay")}>
                <input id="dl" className="input" maxLength={120} placeholder={t("editor.delayPlaceholder")} value={q.delay} onChange={(e) => setQ({ ...q, delay: e.target.value })} />
              </Field>
              <Field htmlFor="nt" label={t("editor.notes")}>
                <input id="nt" className="input" maxLength={600} value={q.notes} onChange={(e) => setQ({ ...q, notes: e.target.value })} />
              </Field>
            </div>
          </section>

          <section className="space-y-4" aria-labelledby="h-lines">
            <h2 id="h-lines" className="text-lg font-semibold">
              {t("editor.lines")}
            </h2>
            {q.lines.map((l, i) => (
              <LineCard
                key={l.id}
                l={l}
                i={i}
                t={t}
                settings={settings}
                valid={valid(l)}
                onChange={(p) => setLine(i, p)}
                onRemove={q.lines.length > 1 ? () => setQ({ ...q, lines: q.lines.filter((_, j) => j !== i) }) : undefined}
                onDuplicate={() => setQ({ ...q, lines: [...q.lines.slice(0, i + 1), { ...l, id: crypto.randomUUID() }, ...q.lines.slice(i + 1)] })}
                num={num}
              />
            ))}
            <button type="button" className="btn-secondary" onClick={() => setQ({ ...q, lines: [...q.lines, newLine(settings)] })}>
              + {t("editor.addLine")}
            </button>
          </section>

          <ProfileNeeds lines={validLines} barLen={settings.barLength} kerf={settings.kerf} t={t} />
        </div>

        {/* Colonne de synthèse : reste visible pendant la saisie sur grand écran */}
        <aside className="space-y-4 xl:sticky xl:top-20" aria-label="Total">
          <section className="card space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">{t("editor.totalHt")}</span>
              <span>{fmt(ht)} {t("common.currency")}</span>
            </div>
            {q.terms.tva > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">{t("editor.totalTva")} {q.terms.tva} %</span>
                <span>{fmt(tva)} {t("common.currency")}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-line pt-2">
              <span className="font-semibold">{t("editor.totalTtc")}</span>
              <span className="text-2xl font-bold text-primary">{fmt(ttc)} <span className="text-sm">{t("common.currency")}</span></span>
            </div>
          </section>

          <section className="card space-y-1 text-sm">
            <h3 className="font-semibold">{t("editor.materials")}</h3>
            <p className="flex justify-between"><span className="text-muted">{t("needs.totalBars")}</span><span className="font-semibold">{plan.bars}</span></p>
            <p className="flex justify-between"><span className="text-muted">{t("needs.totalUsed")}</span><span className="font-semibold">{meters(plan.usedLen)}</span></p>
            <p className="flex justify-between"><span className="text-muted">{t("needs.totalWaste")}</span><span className="font-semibold">{meters(plan.wasteLen)} ({plan.wastePct} %)</span></p>
          </section>

          <section className="card space-y-3">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" className="size-5" checked={attachCut} onChange={(e) => setAttachCut(e.target.checked)} />
              {t("editor.attachCut")}
            </label>
            <div className="flex flex-col gap-2">
              <button type="button" className="btn-primary" onClick={() => submit(true)}>
                <FileDown size={18} aria-hidden />
                {t("editor.savePdf")}
              </button>
              <button type="button" className="btn-secondary" onClick={() => submit(false)}>
                <Save size={18} aria-hidden />
                {t("editor.saveDraft")}
              </button>
            </div>
            <p role="status" className={`text-sm font-medium ${msg?.ok ? "text-ok" : "text-danger"}`}>
              {msg?.text}
            </p>
          </section>
        </aside>
      </div>
    </form>
  );
}

function LineCard({
  l, i, t, settings, valid, onChange, onRemove, onDuplicate, num,
}: {
  l: Line;
  i: number;
  t: T;
  settings: Settings;
  valid: boolean;
  onChange: (p: Partial<Line>) => void;
  onRemove?: () => void;
  onDuplicate: () => void;
  num: (v: string) => number;
}) {
  const cat = l.category;
  const openable = cat === "fenetre" || cat === "porte";
  const hasGlass = cat === "garde-corps" ? l.guard === "verre" : cat !== "volet" && !(cat === "porte" && l.infill === "pleine");
  const canPattern = PATTERN_GLASSES.includes(l.glassType);
  const sk = valid ? drawingSvg(l, l.id, 360, 280) : null;
  const tooLong = valid && cuttingPlan(cutList(l).pieces).some((p) => p.tooLong.length > 0);
  const auto = valid ? price(l, settings) : l.unit;
  const spec = leavesSpec(l);
  const p = (k: string) => `${l.id}-${k}`;

  return (
    <fieldset className="card grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
      <legend className="px-2 text-sm font-semibold text-muted">
        {t("editor.line")} {i + 1} — {cap(lineTitle(l, t))}
      </legend>

      <div className="min-w-0 space-y-5">
        <Choice name={p("cat")} legend={t("editor.category")} value={cat} options={CATEGORIES.map((c) => ({ value: c, label: t(`cat.${c}`) }))} onChange={(category) => onChange({ category })} />

        {cat === "volet" && (
          <>
            <Choice name={p("sh")} legend={t("editor.shutter")} value={l.shutter} options={SHUTTERS.map((s) => ({ value: s, label: t(`shutter.${s}`) }))} onChange={(shutter) => onChange({ shutter })} />
            <Choice name={p("ct")} legend={t("editor.control")} value={l.control} options={CONTROLS.map((c) => ({ value: c, label: cap(t(`control.${c}`)) }))} onChange={(control) => onChange({ control })} />
          </>
        )}
        {cat === "garde-corps" && <Choice name={p("gd")} legend={t("editor.guard")} value={l.guard} options={GUARDS.map((g) => ({ value: g, label: cap(t(`guard.${g}`)) }))} onChange={(guard) => onChange({ guard })} />}
        {openable && <Choice name={p("op")} legend={t("editor.opening")} value={l.opening} options={OPENINGS_BY_CATEGORY[cat].map((o) => ({ value: o, label: cap(t(`opening.${o}`)) }))} onChange={(opening) => onChange({ opening })} />}
        {spec && spec.max > spec.min && (
          <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
            <Choice
              name={p("lv")}
              legend={cat === "cloison" ? t("editor.panels") : t("editor.leaves")}
              value={l.leaves}
              options={spec.presets.map((n) => ({ value: n, label: n === 1 ? t("editor.oneLeaf") : `${n} ${cat === "cloison" ? t("editor.panelsWord") : t("editor.leavesWord")}` }))}
              onChange={(leaves) => onChange({ leaves })}
            />
            <Field htmlFor={p("lc")} label={t("editor.leavesCustom")} hint={t("editor.leavesRange").replace("{min}", String(spec.min)).replace("{max}", String(spec.max))}>
              <input id={p("lc")} className="input !w-28" type="number" inputMode="numeric" min={spec.min} max={spec.max} value={l.leaves} onChange={(e) => onChange({ leaves: num(e.target.value) })} />
            </Field>
          </div>
        )}
        {cat === "porte" && <Choice name={p("in")} legend={t("editor.infill")} value={l.infill} options={INFILLS.map((x) => ({ value: x, label: t(`infill.${x}`) }))} onChange={(infill) => onChange({ infill })} />}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field htmlFor={p("w")} label={cat === "garde-corps" ? t("editor.length") : t("editor.width")}>
            <input id={p("w")} className="input" type="number" inputMode="numeric" value={l.width || ""} aria-invalid={!valid} onChange={(e) => onChange({ width: num(e.target.value) })} />
          </Field>
          <Field htmlFor={p("h")} label={t("editor.height")}>
            <input id={p("h")} className="input" type="number" inputMode="numeric" value={l.height || ""} aria-invalid={!valid} onChange={(e) => onChange({ height: num(e.target.value) })} />
          </Field>
          <Field htmlFor={p("q")} label={t("editor.qty")}>
            <input id={p("q")} className="input" type="number" inputMode="numeric" min={1} value={l.qty || ""} onChange={(e) => onChange({ qty: num(e.target.value) })} />
          </Field>
        </div>
        {!valid && <p role="alert" className="text-sm font-medium text-danger">{t("editor.invalidSize")}</p>}
        {tooLong && <p role="alert" className="text-sm font-medium text-danger">{t("editor.tooLong")}</p>}

        <Choice name={p("rg")} legend={t("editor.range")} value={l.range} options={RANGES.map((r) => ({ value: r, label: t(`range.${r}`) }))} onChange={(range) => onChange({ range })} />
        <FinishPicker name={p("fn")} legend={t("editor.finish")} value={l.finish} onChange={(finish) => onChange({ finish })} t={t} />

        {hasGlass && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field htmlFor={p("gt")} label={t("editor.glassType")}>
              <select id={p("gt")} className="input" value={l.glassType} onChange={(e) => onChange({ glassType: e.target.value as Line["glassType"] })}>
                {GLASSES.map((g) => <option key={g.id} value={g.id}>{t(g.label)}</option>)}
              </select>
            </Field>
            <Field htmlFor={p("th")} label={t("editor.thickness")}>
              <select id={p("th")} className="input" value={l.thickness} onChange={(e) => onChange({ thickness: e.target.value as Line["thickness"] })}>
                {THICKNESSES.map((x) => <option key={x} value={x}>{t(`thickness.${x}`)}</option>)}
              </select>
            </Field>
            <Field htmlFor={p("pt")} label={t("editor.pattern")}>
              <select id={p("pt")} className="input" disabled={!canPattern} value={canPattern ? l.pattern : "none"} onChange={(e) => onChange({ pattern: e.target.value as Line["pattern"] })}>
                {PATTERNS.map((x) => <option key={x} value={x}>{t(`pattern.${x}`)}</option>)}
              </select>
            </Field>
          </div>
        )}

        {openable && (
          <fieldset>
            <legend className="mb-1 text-sm font-medium">{t("editor.extras")}</legend>
            <div className="flex flex-wrap gap-x-6">
              {EXTRAS.map((x) => (
                <label key={x} className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" className="size-5" checked={l.extras.includes(x)} onChange={(e) => onChange({ extras: e.target.checked ? [...l.extras, x] : l.extras.filter((y) => y !== x) })} />
                  {t(`extra.${x}`)}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="grid items-end gap-4 border-t border-line pt-4 sm:grid-cols-2">
          <Field htmlFor={p("u")} label={t("editor.unit")} hint={t("editor.unitHint")}>
            <input id={p("u")} className="input" type="number" inputMode="numeric" min={0} value={l.unit || ""} onChange={(e) => onChange({ unit: num(e.target.value) })} />
          </Field>
          <div>
            <p className="text-sm text-muted">{t("editor.lineTotal")}</p>
            <p className="text-xl font-bold">{fmt(lineTotal(l))} {t("common.currency")}</p>
            {valid && <p className="text-xs text-muted">{t("editor.area")} : {fmt(Math.round(billedArea(l, settings.minArea) * 100) / 100)} m²</p>}
          </div>
          {auto !== l.unit && (
            <button type="button" className="btn-secondary sm:col-span-2 sm:w-fit" onClick={() => onChange({ unit: auto })}>
              {t("editor.recalc")}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
        <p className="text-xs text-muted">{t("editor.preview")}</p>
        {sk ? (
          <div role="img" aria-label={`${lineTitle(l, t)} ${l.width} × ${l.height} mm`} className="flex justify-center rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: sk.svg }} />
        ) : (
          <div className="h-44 rounded-xl bg-surface-2" />
        )}
        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onDuplicate}>
            <Copy size={16} aria-hidden />
            {t("editor.duplicateLine")}
          </button>
          {onRemove && (
            <button type="button" className="btn-danger" onClick={onRemove} aria-label={t("editor.removeLine")} title={t("editor.removeLine")}>
              <Trash2 size={16} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </fieldset>
  );
}
