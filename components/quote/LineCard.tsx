"use client";
import { Box, ChevronDown, Copy, Minus, Plus, Image as ImageIcon, Ruler, Trash2 } from "lucide-react";
import { createContext, useContext, useState } from "react";
import LineComments from "../LineComments";
import Viewer3DLoader from "../Viewer3DLoader";
import { Choice, Field, FinishPicker } from "../ui";
import { billedArea, cutList, cuttingPlan, fmt, lineTotal } from "@/lib/calc";
import { costLine, marginOf } from "@/lib/costing";
import { lineTitle } from "@/lib/describe";
import { drawingSvg } from "@/lib/drawing";
import { type T } from "@/lib/i18n";
import { CATEGORIES, BOXES, CONTROLS, SLATS_RIDEAU, SLATS_ROULANT, type Slat, EXTRAS, FINISHES, GLASSES, GUARDS, INFILLS, type Line, OPENINGS_BY_CATEGORY, PATTERNS, PATTERN_GLASSES, DIRECTIONS, type LeafMode, hasLeafConfig, rangeOn, leafMarks, leafModes, presetModes, RANGES, SHUTTERS, THICKNESSES, type Settings, leavesSpec } from "@/lib/model";
import Select from "../Select";
import { cap, price } from "./line";

// Une carte d'ouvrage : configuration (type, dimensions, finitions, prix), aperçu 2D/3D et commentaires.
export function LineCard({
  l, i, t, settings, valid, onChange, onRemove, onDuplicate, onNeeds, num, clientMode = false, open = true, onToggle, locked = false, mark, quoteId, focused = false,
}: {
  l: Line;
  i: number;
  t: T;
  settings: Settings;
  valid: boolean;
  onChange: (p: Partial<Line>) => void;
  onRemove?: () => void;
  onDuplicate: () => void;
  onNeeds: () => void;
  num: (v: string) => number;
  clientMode?: boolean; // demande d'un client : pas de prix ni de détail des profilés
  open?: boolean;
  onToggle?: () => void; // fourni : la carte est dépliable, avec un en-tête résumé
  locked?: boolean;
  mark?: string; // repère d'ouvrage (F-01…)
  quoteId?: string; // devis lié à un client : affiche le fil de commentaires de l'ouvrage
  focused?: boolean; // ouvrage visé par une notification
}) {
  const [view, setView] = useState<"2d" | "3d">("2d");
  const cat = l.category;
  const openable = cat === "fenetre" || cat === "porte";
  const hasGlass = cat === "garde-corps" ? l.guard === "verre" : cat !== "volet" && !(cat === "porte" && l.infill === "pleine");
  const canPattern = PATTERN_GLASSES.includes(l.glassType);
  const sk = valid ? drawingSvg(l, l.id, 360, 280) : null;
  const tooLong = valid && cuttingPlan(cutList(l).pieces).some((p) => p.tooLong.length > 0);
  const auto = valid ? price(l, settings) : l.unit;
  // coût de revient d'un ouvrage (jamais montré au client)
  const cost = open && !clientMode && valid ? costLine(l, settings) : null;
  const margin = cost ? marginOf(l.unit, cost.full) : 0;
  const tone = margin < 0 ? "text-danger" : margin < settings.minMarginPct ? "text-warn" : "text-ok";
  const spec = leavesSpec(l);
  const p = (k: string) => `${l.id}-${k}`;
  // impact de l'option sur le prix (majoration des réglages), affiché à côté du choix
  const pct = (key: string) => {
    const v = key ? settings.surcharges[key] : 0;
    return v ? ` (${v > 0 ? "+" : ""}${v} %)` : "";
  };

  const title = `${mark ?? `${t("editor.line")} ${i + 1}`} — ${cap(lineTitle(l, t))}`;
  // Une colonne jusqu'à 2xl (l'illustration passe au-dessus), puis formulaire + illustration fixe à droite.
  const grid = "min-w-0";
  const body = (
    <>
      <div className="@container min-w-0">
       <div className="grid gap-3 @2xl:grid-cols-[1.15fr_1fr] @2xl:items-start">
        <div className="contents @2xl:flex @2xl:min-w-0 @2xl:flex-col @2xl:gap-3">
        <Panel title={t("editor.sectionConfig")} className="order-2 @2xl:order-none">
          <Choice dense name={p("cat")} legend={t("editor.category")} value={cat} options={CATEGORIES.map((c) => ({ value: c, label: t(`cat.${c}`) }))} onChange={(category) => onChange({ category })} />

          {cat === "volet" && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Choice dense name={p("sh")} legend={t("editor.shutter")} value={l.shutter} options={SHUTTERS.map((s) => ({ value: s, label: t(`shutter.${s}`) }))} onChange={(shutter) => onChange({ shutter })} />
                <Choice dense name={p("ct")} legend={t("editor.control")} value={l.control} options={CONTROLS.map((c) => ({ value: c, label: cap(t(`control.${c}`)) + pct(c === "motorise" ? "control.motorise" : "") }))} onChange={(control) => onChange({ control })} />
              </div>
              <Choice
                dense
                name={p("bx")}
                legend={t("editor.box")}
                value={l.box ?? "apparent"}
                options={BOXES.filter((b) => l.shutter === "roulant" || b !== "tunnel").map((b) => ({ value: b, label: t(`box.${b}`) + pct(`volet.box.${b}`) }))}
                onChange={(box) => onChange({ box })}
              />
              <Choice
                dense
                name={p("sl")}
                legend={t("editor.slat")}
                value={(l.slat ?? (l.shutter === "roulant" ? "39" : "pleine")) as Slat}
                options={(l.shutter === "roulant" ? SLATS_ROULANT : SLATS_RIDEAU).map((s) => ({ value: s as Slat, label: t(`slat.${s}`) + pct(`volet.slat.${s}`) }))}
                onChange={(slat) => onChange({ slat })}
              />
              <label className="flex min-h-9 w-fit cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" checked={!!l.net} onChange={(e) => onChange({ net: e.target.checked })} />
                <span className="flex min-h-9 items-center rounded-lg border border-line bg-surface px-2.5 text-sm font-medium peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-primary">
                  {t("editor.vnet")}
                  {pct("volet.net")}
                </span>
              </label>
            </div>
          )}
          {cat === "garde-corps" && <Choice dense name={p("gd")} legend={t("editor.guard")} value={l.guard} options={GUARDS.map((g) => ({ value: g, label: cap(t(`guard.${g}`)) }))} onChange={(guard) => onChange({ guard })} />}
          {openable && <Choice dense name={p("op")} legend={t("editor.opening")} value={l.opening} options={OPENINGS_BY_CATEGORY[cat].map((o) => ({ value: o, label: cap(t(`opening.${o}`)) }))} onChange={(opening) => onChange({ opening })} />}

          {(spec && spec.max > spec.min) || cat === "porte" ? (
            <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
              {spec && spec.max > spec.min && (
                <Stepper
                  id={p("lv")}
                  label={cat === "cloison" ? t("editor.panels") : t("editor.leaves")}
                  value={l.leaves}
                  min={spec.min}
                  max={spec.max}
                  hint={t("editor.leavesRange").replace("{min}", String(spec.min)).replace("{max}", String(spec.max))}
                  onChange={(leaves) => onChange({ leaves })}
                />
              )}
              {cat === "porte" && <Choice dense name={p("in")} legend={t("editor.infill")} value={l.infill} options={INFILLS.map((x) => ({ value: x, label: t(`infill.${x}`) }))} onChange={(infill) => onChange({ infill })} />}
            </div>
          ) : null}

          {hasLeafConfig(l) && <LeafConfig l={l} t={t} onChange={onChange} id={l.id} />}
        </Panel>

        <Panel title={t("editor.sectionSizePlace")} className="order-3 @2xl:order-none">
          <div className="grid grid-cols-3 gap-3">
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
          <div className="grid gap-3 sm:grid-cols-2">
            <Field htmlFor={p("room")} label={t("editor.room")}>
              <input id={p("room")} className="input" maxLength={60} placeholder={t("editor.roomPlaceholder")} value={l.room ?? ""} onChange={(e) => onChange({ room: e.target.value })} />
            </Field>
            <Field htmlFor={p("note")} label={t("editor.lineNote")}>
              <input id={p("note")} className="input" maxLength={300} value={l.note ?? ""} onChange={(e) => onChange({ note: e.target.value })} />
            </Field>
          </div>
        </Panel>

        {!clientMode && (
          <Panel title={t("editor.sectionPrice")} className="order-5 @2xl:order-none">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-44">
                  <Field htmlFor={p("u")} label={t("editor.unit")}>
                    <input id={p("u")} className="input" type="number" inputMode="numeric" min={0} value={l.unit || ""} onChange={(e) => onChange({ unit: num(e.target.value) })} />
                  </Field>
                </div>
                {auto !== l.unit && (
                  <button type="button" className="btn-secondary" onClick={() => onChange({ unit: auto })}>
                    {t("editor.recalc")} ({fmt(auto)})
                  </button>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">{t("editor.lineTotal")}{valid ? ` · ${fmt(Math.round(billedArea(l, settings.minArea) * 100) / 100)} m²` : ""}</p>
                <p className="text-xl font-bold tabular-nums">{fmt(lineTotal(l))} {t("common.currency")}</p>
              </div>
            </div>
            {cost && (
              <div className="space-y-2 rounded-lg border border-line bg-surface p-3">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                  <div><dt className="text-xs text-muted">{t("cost.material")}</dt><dd className="font-semibold tabular-nums">{fmt(cost.material)}</dd></div>
                  <div><dt className="text-xs text-muted">{t("cost.labor")}</dt><dd className="font-semibold tabular-nums">{fmt(cost.labor)}</dd></div>
                  <div><dt className="text-xs text-muted">{t("cost.full")}</dt><dd className="font-semibold tabular-nums">{fmt(cost.full)}</dd></div>
                  <div><dt className="text-xs text-muted">{t("cost.margin")}</dt><dd className={`font-bold tabular-nums ${tone}`}>{margin > 0 ? "+" : ""}{margin} %</dd></div>
                </dl>
                <p role="status" className={`text-xs font-medium ${tone}`}>
                  {margin < 0 ? t("cost.loss") : margin < settings.minMarginPct ? t("cost.low") : t("cost.ok")}
                </p>
                {cost.incomplete && <p role="alert" className="text-xs font-medium text-warn">{t("cost.incomplete")}</p>}
                <p className="text-[11px] text-muted">{t("cost.shared")}</p>
              </div>
            )}
            <p className="text-xs text-muted">{t("editor.unitHint")}</p>
          </Panel>
        )}
        </div>
        <div className="contents @2xl:flex @2xl:min-w-0 @2xl:flex-col @2xl:gap-3">
        <div className="order-1 min-w-0 space-y-3 @2xl:order-none">
        <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted">{view === "3d" ? t("viewer.title") : t("editor.preview")}</p>
          <div role="group" aria-label={t("editor.preview")} className="flex gap-0.5 rounded-full border border-line p-0.5">
            <button type="button" aria-pressed={view === "2d"} onClick={() => setView("2d")} className={`flex min-h-8 items-center gap-1 rounded-full px-2.5 text-xs font-medium ${view === "2d" ? "bg-primary text-on-primary" : "text-muted hover:text-ink"}`}>
              <ImageIcon size={13} aria-hidden />
              {t("viewer.show2d")}
            </button>
            <button type="button" aria-pressed={view === "3d"} disabled={!valid} onClick={() => setView("3d")} className={`flex min-h-8 items-center gap-1 rounded-full px-2.5 text-xs font-medium disabled:opacity-50 ${view === "3d" ? "bg-primary text-on-primary" : "text-muted hover:text-ink"}`}>
              <Box size={13} aria-hidden />
              {t("viewer.show3d")}
            </button>
          </div>
        </div>
        {view === "3d" && valid ? (
          <Viewer3DLoader line={l} />
        ) : sk ? (
          <div role="img" aria-label={`${lineTitle(l, t)} ${l.width} × ${l.height} mm`} className="flex justify-center rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: sk.svg }} />
        ) : (
          <div className="h-44 rounded-xl bg-surface-2" />
        )}
        </div>
        <div className="space-y-3">
        {!clientMode && (
          <button type="button" className="btn-secondary w-full" onClick={onNeeds} disabled={!valid}>
            <Ruler size={16} aria-hidden />
            {t("needsPage.open")}
          </button>
        )}
        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onDuplicate} disabled={locked}>
            <Copy size={16} aria-hidden />
            {t("editor.duplicateLine")}
          </button>
          {onRemove && (
            <button type="button" className="btn-danger" onClick={onRemove} disabled={locked} aria-label={t("editor.removeLine")} title={t("editor.removeLine")}>
              <Trash2 size={16} aria-hidden />
            </button>
          )}
        </div>
        </div>
      </div>
        <Panel title={t("editor.sectionFinish")} className="order-4 @2xl:order-none">
          <Choice dense name={p("rg")} legend={t("editor.range")} value={l.range} options={RANGES.filter((r) => r === l.range || rangeOn(settings.market, r)).map((r) => ({ value: r, label: t(`range.${r}`) }))} onChange={(range) => onChange({ range })} />
          <FinishPicker dense name={p("fn")} legend={t("editor.finish")} value={l.finish} onChange={(finish) => onChange({ finish })} t={t} hide={settings.market.off?.finishes} />

          {hasGlass && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
              <Field htmlFor={p("gt")} label={t("editor.glassType")}>
                <Select id={p("gt")} value={l.glassType} onChange={(v) => onChange({ glassType: v as Line["glassType"] })} options={GLASSES.map((g) => ({ value: g.id, label: t(g.label) }))} />
              </Field>
              </div>
              <Field htmlFor={p("th")} label={t("editor.thickness")}>
                <Select id={p("th")} value={l.thickness} onChange={(v) => onChange({ thickness: v as Line["thickness"] })} options={THICKNESSES.map((x) => ({ value: x, label: t(`thickness.${x}`) }))} />
              </Field>
              <Field htmlFor={p("pt")} label={t("editor.pattern")}>
                <Select id={p("pt")} disabled={!canPattern} value={canPattern ? l.pattern : "none"} onChange={(v) => onChange({ pattern: v as Line["pattern"] })} options={PATTERNS.map((x) => ({ value: x, label: t(`pattern.${x}`) }))} />
              </Field>
            </div>
          )}

          {openable && (
            <fieldset>
              <legend className="mb-1 text-sm font-medium">{t("editor.extras")}</legend>
              <div className="flex flex-wrap gap-2">
                {EXTRAS.map((x) => (
                  <label key={x} className="cursor-pointer">
                    <input type="checkbox" className="peer sr-only" checked={l.extras.includes(x)} onChange={(e) => onChange({ extras: e.target.checked ? [...l.extras, x] : l.extras.filter((y) => y !== x) })} />
                    <span className="flex min-h-9 items-center rounded-lg border border-line bg-surface px-2.5 text-sm font-medium peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-primary">{t(`extra.${x}`)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </Panel>

        </div>
       </div>
      </div>

    </>
  );

  if (!onToggle)
    return (
      <fieldset className={`card ${grid}`}>
        <legend className="px-2 text-sm font-semibold text-muted">{title}</legend>
        {body}
      </fieldset>
    );

  const finish = FINISHES.find((f) => f.id === l.finish);
  const thumb = valid && !open ? drawingSvg(l, `th${l.id}`, 76, 58) : null;
  const leafList = valid && (cat === "fenetre" || cat === "porte" || cat === "cloison") && l.leaves > 1 ? leafMarks(l).join(" · ") : "";
  return (
    <div id={`line-${l.id}`} className={`card scroll-mt-20 !p-0 ${valid ? "" : "border-danger"} ${focused ? "ring-2 ring-primary" : ""}`}>
      <h3 className="m-0">
        <button type="button" aria-expanded={open} aria-controls={`${l.id}-body`} onClick={onToggle} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left hover:bg-surface-2/60 sm:px-6">
          <ChevronDown size={18} aria-hidden className={`shrink-0 text-muted transition-transform ${open ? "" : "-rotate-90"}`} />
          {thumb && <span aria-hidden className="hidden h-14 w-[4.75rem] shrink-0 place-items-center rounded-lg bg-white sm:grid p-0.5 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: thumb.svg }} />}
          <span className="min-w-0 flex-1">
            <span className="block break-words font-semibold leading-snug sm:truncate">{title}</span>
            <span className="flex flex-wrap items-center gap-x-2 text-sm font-normal text-muted">
              <span>{valid ? `${l.width} × ${l.height} mm` : t("editor.invalidSize")}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-3 rounded-full border border-line" style={{ background: finish?.hex }} />
                {t(`range.${l.range}`)}
              </span>
              {leafList && (
                <>
                  <span aria-hidden>·</span>
                  <span className="font-medium tabular-nums">{leafList}</span>
                </>
              )}
            </span>
          </span>
          {!clientMode && (
            <span className="shrink-0 text-right">
              <span className="block font-semibold tabular-nums">{valid ? fmt(lineTotal(l)) : "—"} {t("common.currency")}</span>
              <span className="text-xs font-normal text-muted">{t("editor.qty")} : {l.qty}</span>
            </span>
          )}
          <span className="sr-only">{open ? t("editor.collapseLine") : t("editor.expandLine")}</span>
        </button>
      </h3>
      {open && (
        // seuls les champs de saisie (les blocs « Panel ») sont verrouillés : l'aperçu 2D/3D et le détail des profilés restent consultables
        <LockedCtx.Provider value={locked}>
          <div id={`${l.id}-body`} className={`border-t border-line p-4 sm:p-6 ${grid}`}>
            {body}
          </div>
        </LockedCtx.Provider>
      )}
      {open && quoteId && (
        <div className="border-t border-line p-4 sm:p-6">
          <LineComments quoteId={quoteId} lineId={l.id} me="menuisier" />
        </div>
      )}
    </div>
  );
}


// Bloc de formulaire d'un ouvrage : cadre discret, titre en capitales.
const LockedCtx = createContext(false);
function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  const locked = useContext(LockedCtx);
  return (
    <fieldset disabled={locked} className={`m-0 min-w-0 space-y-3 rounded-xl border border-line bg-surface-2/30 p-3.5 sm:p-4 ${className}`}>
      <h4 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span aria-hidden className="h-4 w-1 rounded-full bg-primary" />
        {title}
      </h4>
      {children}
    </fieldset>
  );
}

// Nombre entier borné avec − / + (remplace les puces + champ « autre nombre »).
function Stepper({ id, label, value, min, max, hint, onChange }: { id: string; label: string; value: number; min: number; max: number; hint?: string; onChange: (n: number) => void }) {
  const set = (n: number) => onChange(Math.min(max, Math.max(min, Math.round(n) || min)));
  const btn = "grid size-10 place-items-center text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      <div className="inline-flex items-center overflow-hidden rounded-lg border border-line bg-surface">
        <button type="button" className={btn} onClick={() => set(value - 1)} disabled={value <= min} aria-label={`${label} −`}>
          <Minus size={16} aria-hidden />
        </button>
        <input id={id} type="number" inputMode="numeric" min={min} max={max} value={value} onChange={(e) => set(Number(e.target.value))} className="h-10 w-12 border-x border-line bg-transparent text-center text-sm font-semibold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
        <button type="button" className={btn} onClick={() => set(value + 1)} disabled={value >= max} aria-label={`${label} +`}>
          <Plus size={16} aria-hidden />
        </button>
      </div>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

// Un vantail par tuile : repère professionnel (V1, F1…) et fonction (fixe, coulisse, charnières). Les raccourcis remplissent toutes les tuiles d'un coup.
function LeafConfig({ l, t, onChange, id }: { l: Line; t: T; onChange: (p: Partial<Line>) => void; id: string }) {
  const modes = leafModes(l);
  const marks = leafMarks(l);
  const sliding = l.opening === "coulissant";
  const n = l.leaves;
  const label = (m: LeafMode) => t(m === "F" ? "leaf.F" : m === "B" ? "leaf.B" : l.opening === "soufflet" ? "leaf.mobile" : sliding ? (m === "L" ? "leaf.slideL" : "leaf.slideR") : m === "L" ? "leaf.hingeL" : "leaf.hingeR");
  const allowed = (i: number): LeafMode[] => (sliding ? (["F", ...(i > 0 ? ["L"] : []), ...(i < n - 1 ? ["R"] : [])] as LeafMode[]) : l.opening === "soufflet" ? ["F", "L"] : l.category === "porte" ? ["F", "L", "R", "B"] : ["F", "L", "R"]);
  const same = (a: LeafMode[], b: LeafMode[]) => a.join() === b.join();
  const set = (i: number, m: LeafMode) => onChange({ leafCfg: modes.map((x, j) => (j === i ? m : x)) });
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-sm font-medium">{t("editor.leafConfig")}</legend>
      {sliding && (
        <div role="group" aria-label={t("editor.shortcuts")} className="flex flex-wrap items-center gap-1.5">
          {DIRECTIONS.map((d) => (
            <button key={d} type="button" aria-pressed={same(modes, presetModes(l, d))} onClick={() => onChange({ direction: d, leafCfg: presetModes(l, d) })} className="min-h-8 rounded-full border border-line px-3 text-xs font-medium hover:bg-surface-2 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-on-primary">
              {t(`dir.${d}.slide`)}
            </button>
          ))}
        </div>
      )}
      <ul className="flex flex-wrap gap-2">
        {modes.map((m, i) => (
          <li key={i} className={`flex min-w-[7.5rem] flex-col gap-1 rounded-lg border p-1.5 ${m === "F" ? "border-line bg-surface-2/60" : "border-primary/50 bg-primary/5"}`}>
            <label htmlFor={`${id}-lf${i}`} className="text-xs font-bold tabular-nums">{marks[i]}</label>
            <Select id={`${id}-lf${i}`} className="!min-h-8 !px-2 !py-0.5 text-xs" value={m} onChange={(v) => set(i, v as LeafMode)} options={allowed(i).map((x) => ({ value: x, label: label(x) }))} />
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
