"use client";
import { ChevronDown, FlaskConical, RotateCcw, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { NumField, ProfilesEditor } from "./Catalog";
import { Choice, FinishPicker } from "./ui";
import { fmt } from "@/lib/calc";
import type { T } from "@/lib/i18n";
import { FINISHES, type FinishId, type Line, type Market, RANGES, finishOn, rangeOn } from "@/lib/model";
import { type Sim, initSim, simulate } from "@/lib/procure";

const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(Math.abs(n))}`;

// Simulateur : le menuisier essaie une autre gamme, une autre couleur, d'autres prix ; tout est local, rien n'est enregistré sans son accord.
export function MarketSim({ sim, setSim, lines, kerf, baseCost, cost, saved, onSave, t }: { sim: Sim; setSim: (s: Sim) => void; lines: Line[]; kerf: number; baseCost: number; cost: number; saved: Market; onSave: (scope: "quote" | "global") => void; t: T }) {
  const [open, setOpen] = useState(true);
  const cur = t("common.currency");
  const marketChanged = JSON.stringify(sim.market) !== JSON.stringify(saved);
  const dirty = sim.range !== "" || sim.finish !== "" || sim.pct !== 0 || marketChanged;
  const setMarket = (m: Market) => setSim({ ...sim, market: m });
  const diff = cost - baseCost;

  // Coût total des achats du devis pour chaque couleur, avec les autres hypothèses.
  const byFinish = useMemo(() => FINISHES.map((f) => ({ f, cost: simulate(lines, sim, kerf, f.id).allCost })), [lines, sim, kerf]);
  const cheapest = Math.min(...byFinish.map((x) => x.cost));

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm" aria-labelledby="h-sim">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-primary/10 to-transparent px-5 py-4">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex items-center gap-3 text-left">
          <span aria-hidden className="grid size-10 place-items-center rounded-xl bg-primary text-on-primary">
            <FlaskConical size={20} />
          </span>
          <span>
            <span className="flex items-center gap-2">
              <h2 id="h-sim" className="text-lg font-semibold">{t("sim.title")}</h2>
              {dirty && <span className="rounded-full bg-warn/15 px-2.5 py-0.5 text-xs font-semibold text-warn">{t("sim.active")}</span>}
              <ChevronDown size={18} aria-hidden className={`text-muted transition-transform ${open ? "" : "-rotate-90"}`} />
            </span>
            {open && <span className="mt-0.5 block max-w-2xl text-sm font-normal text-muted">{t("sim.hint")}</span>}
          </span>
        </button>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary !min-h-10" disabled={!dirty} onClick={() => setSim(initSim(saved))}>
            <RotateCcw size={15} aria-hidden />
            {t("sim.reset")}
          </button>
          <span className="flex items-center gap-2 rounded-xl border border-line bg-surface p-1 pl-3">
            <span className="text-sm font-medium text-muted">{t("sim.keep")}</span>
            <button type="button" className="btn-secondary !min-h-9 !px-3" disabled={!marketChanged && sim.pct === 0} onClick={() => onSave("quote")}>
              <Save size={15} aria-hidden />
              {t("sim.forQuote")}
            </button>
            <button type="button" className="btn-primary !min-h-9 !px-3" disabled={!marketChanged && sim.pct === 0} onClick={() => onSave("global")}>
              <Save size={15} aria-hidden />
              {t("sim.forAll")}
            </button>
          </span>
        </div>
      </div>

      {open && (
        <div className="space-y-6 border-t border-line p-5">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <Choice
                dense
                name="sim-range"
                legend={t("sim.range")}
                value={sim.range}
                options={[{ value: "", label: t("sim.asInQuote") }, ...RANGES.map((r) => ({ value: r, label: `${t(`range.${r}`)}${rangeOn(sim.market, r) ? "" : ` (${t("market.unavailable")})`}` }))]}
                onChange={(range) => setSim({ ...sim, range })}
              />

              <FinishPicker
                dense
                name="sim-finish"
                legend={t("sim.finish")}
                value={(sim.finish || "") as FinishId}
                onChange={(finish) => setSim({ ...sim, finish })}
                t={t}
                lead={
                  <button type="button" aria-pressed={sim.finish === ""} onClick={() => setSim({ ...sim, finish: "" })} className="mr-2 min-h-8 rounded-full border border-line px-3 text-xs font-medium hover:bg-surface-2 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-on-primary">
                    {t("sim.asInQuote")}
                  </button>
                }
              />

              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="sim-pct" className="text-sm font-medium">{t("sim.pct")}</label>
                  <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums ${sim.pct === 0 ? "bg-surface-2 text-muted" : sim.pct > 0 ? "bg-critical/15 text-danger" : "bg-good/15 text-ok"}`}>{sim.pct > 0 ? "+" : ""}{sim.pct} %</span>
                </div>
                <input id="sim-pct" type="range" min={-30} max={50} step={1} value={sim.pct} onChange={(e) => setSim({ ...sim, pct: Number(e.target.value) })} className="h-2 w-full accent-[var(--primary)]" />
                <p className="text-xs text-muted">{t("sim.pctHint")}</p>
              </div>

              <fieldset className="space-y-2">
                <legend className="mb-1 text-sm font-medium">{t("sim.supplements")}</legend>
                {([
                  ["market.rangeMarkup", sim.market.rangeMarkup, (v: number) => setMarket({ ...sim.market, rangeMarkup: v })],
                  ["market.finishAnodise", sim.market.finishMarkup.anodise, (v: number) => setMarket({ ...sim.market, finishMarkup: { ...sim.market.finishMarkup, anodise: v } })],
                  ["market.finishFauxbois", sim.market.finishMarkup.fauxbois, (v: number) => setMarket({ ...sim.market, finishMarkup: { ...sim.market.finishMarkup, fauxbois: v } })],
                ] as const).map(([label, value, set]) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <span className="text-sm">{t(label)}</span>
                    <NumField label={t(label)} unit="%" width="w-28" value={value} onChange={set} />
                  </div>
                ))}
              </fieldset>
            </div>

            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-medium">{t("sim.byFinish")}</h3>
                <span className="text-xs text-muted">{t("sim.vsBase")} : <strong className={diff > 0 ? "text-danger" : diff < 0 ? "text-ok" : ""}>{signed(diff)} {cur}</strong></span>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {byFinish.map(({ f, cost: c }) => {
                  const sel = sim.finish === f.id;
                  const off = !finishOn(sim.market, f.id);
                  return (
                    <li key={f.id}>
                      <button type="button" aria-pressed={sel} title={off ? t("market.unavailable") : undefined} onClick={() => setSim({ ...sim, finish: f.id })} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-2 ${off ? "opacity-50" : ""} ${sel ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-line"}`}>
                        <span aria-hidden className="size-5 shrink-0 rounded-full border border-black/20" style={{ background: f.hex }} />
                        <span className="min-w-0 flex-1 truncate">{t(f.label)}</span>
                        <span className={`tabular-nums ${c === cheapest ? "font-bold text-ok" : "font-medium"}`}>{fmt(c)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <details className="group rounded-xl border border-line">
            <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold">
              <ChevronDown size={16} aria-hidden className="-rotate-90 text-muted transition-transform group-open:rotate-0" />
              {t("sim.bars")}
            </summary>
            <div className="space-y-3 border-t border-line p-4">
              <p className="text-sm text-muted">{t("cat.profiles.intro")}</p>
              <ProfilesEditor market={sim.market} onChange={setMarket} t={t} />
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
