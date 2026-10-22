"use client";
import { ChevronDown, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Choice, Field, FinishPicker } from "./ui";
import { fmt } from "@/lib/calc";
import type { T } from "@/lib/i18n";
import { FINISHES, type FinishId, type Line, type Market, type Offer, PROFILE_KEYS, RANGES, finishOn, rangeOn } from "@/lib/model";
import { type Sim, initSim, simulate } from "@/lib/procure";

const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(Math.abs(n))}`;

export function MarketSim({ sim, setSim, lines, kerf, baseCost, cost, saved, onSave, t }: { sim: Sim; setSim: (s: Sim) => void; lines: Line[]; kerf: number; baseCost: number; cost: number; saved: Market; onSave: () => void; t: T }) {
  const [open, setOpen] = useState(true);
  const cur = t("common.currency");
  const num = (v: string) => Number(v) || 0;
  const dirty = sim.range !== "" || sim.finish !== "" || sim.pct !== 0 || JSON.stringify(sim.market) !== JSON.stringify(saved);
  const setOffers = (key: string, fn: (o: Offer[]) => Offer[]) => setSim({ ...sim, market: { ...sim.market, offers: { ...sim.market.offers, [key]: fn(sim.market.offers[key] ?? []) } } });
  const setMarket = (m: Partial<Market>) => setSim({ ...sim, market: { ...sim.market, ...m } });

  // Coût du devis pour chaque couleur, avec les autres hypothèses : on voit tout de suite laquelle revient le moins cher.
  const byFinish = useMemo(() => FINISHES.map((f) => ({ f, cost: simulate(lines, sim, kerf, f.id).totalCost })), [lines, sim, kerf]);
  const cheapest = Math.min(...byFinish.map((x) => x.cost));

  return (
    <section className="card !p-0" aria-labelledby="h-sim">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex items-center gap-2 text-left">
          <ChevronDown size={18} aria-hidden className={`text-muted transition-transform ${open ? "" : "-rotate-90"}`} />
          <h2 id="h-sim" className="font-semibold">{t("sim.title")}</h2>
          {dirty && <span className="rounded-full bg-warn/15 px-2.5 py-0.5 text-xs font-semibold text-warn">{t("sim.active")}</span>}
        </button>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary !min-h-9 !px-3" disabled={!dirty} onClick={() => setSim(initSim(saved))}>
            <RotateCcw size={15} aria-hidden />
            {t("sim.reset")}
          </button>
          <button type="button" className="btn-primary !min-h-9 !px-3" disabled={JSON.stringify(sim.market) === JSON.stringify(saved) && sim.pct === 0} onClick={onSave}>
            <Save size={15} aria-hidden />
            {t("sim.apply")}
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-5 border-t border-line p-4">
          <p className="max-w-3xl text-sm text-muted">{t("sim.hint")}</p>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-4">
              <Choice
                dense
                name="sim-range"
                legend={t("sim.range")}
                value={sim.range}
                options={[{ value: "", label: t("sim.asInQuote") }, ...RANGES.map((r) => ({ value: r, label: `${t(`range.${r}`)}${rangeOn(sim.market, r) ? "" : ` (${t("market.unavailable")})`}` }))]}
                onChange={(range) => setSim({ ...sim, range })}
              />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" aria-pressed={sim.finish === ""} onClick={() => setSim({ ...sim, finish: "" })} className="min-h-8 rounded-full border border-line px-3 text-xs font-medium hover:bg-surface-2 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-on-primary">
                    {t("sim.asInQuote")}
                  </button>
                </div>
                <FinishPicker dense name="sim-finish" legend={t("sim.finish")} value={(sim.finish || "") as FinishId} onChange={(finish) => setSim({ ...sim, finish })} t={t} />
              </div>
              <label className="block space-y-1 text-sm font-medium">
                <span className="flex items-center justify-between">
                  {t("sim.pct")}
                  <span className="tabular-nums text-muted">{sim.pct > 0 ? "+" : ""}{sim.pct} %</span>
                </span>
                <input type="range" min={-30} max={50} step={1} value={sim.pct} onChange={(e) => setSim({ ...sim, pct: Number(e.target.value) })} className="h-2 w-full accent-[var(--primary)]" />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field htmlFor="sim-rm" label={t("market.rangeMarkup")}>
                  <input id="sim-rm" type="number" className="input !min-h-9" value={sim.market.rangeMarkup} onChange={(e) => setMarket({ rangeMarkup: num(e.target.value) })} />
                </Field>
                <Field htmlFor="sim-fa" label={t("market.finishAnodise")}>
                  <input id="sim-fa" type="number" className="input !min-h-9" value={sim.market.finishMarkup.anodise} onChange={(e) => setMarket({ finishMarkup: { ...sim.market.finishMarkup, anodise: num(e.target.value) } })} />
                </Field>
                <Field htmlFor="sim-ff" label={t("market.finishFauxbois")}>
                  <input id="sim-ff" type="number" className="input !min-h-9" value={sim.market.finishMarkup.fauxbois} onChange={(e) => setMarket({ finishMarkup: { ...sim.market.finishMarkup, fauxbois: num(e.target.value) } })} />
                </Field>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium">{t("sim.byFinish")}</h3>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {byFinish.map(({ f, cost }) => {
                  const sel = sim.finish === f.id;
                  return (
                    <li key={f.id}>
                      <button type="button" aria-pressed={sel} onClick={() => setSim({ ...sim, finish: f.id })} title={finishOn(sim.market, f.id) ? undefined : t("market.unavailable")} className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm hover:bg-surface-2 ${finishOn(sim.market, f.id) ? "" : "opacity-50"} ${sel ? "border-primary ring-2 ring-primary/30" : "border-line"}`}>
                        <span aria-hidden className="size-4 shrink-0 rounded-full border border-black/20" style={{ background: f.hex }} />
                        <span className="min-w-0 flex-1 truncate">{t(f.label)}</span>
                        <span className={`tabular-nums ${cost === cheapest ? "font-bold text-ok" : "font-medium"}`}>{fmt(cost)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-xs text-muted">
                {t("sim.vsBase")} : {signed(cost - baseCost)} {cur}
              </p>
            </div>
          </div>

          <details className="group rounded-xl border border-line">
            <summary className="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm font-semibold">
              <ChevronDown size={16} aria-hidden className="-rotate-90 text-muted transition-transform group-open:rotate-0" />
              {t("sim.bars")}
            </summary>
            <div className="grid gap-3 border-t border-line p-3 lg:grid-cols-2 2xl:grid-cols-3">
              {PROFILE_KEYS.map((k) => {
                const offers = sim.market.offers[k] ?? [];
                return (
                  <section key={k} aria-labelledby={`sim-${k}`} className="rounded-lg bg-surface-2/60 p-2.5">
                    <h4 id={`sim-${k}`} className="mb-2 text-sm font-semibold">{t(k)}</h4>
                    <ul className="space-y-1.5">
                      {offers.map((o, i) => (
                        <li key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-1.5">
                          <input aria-label={`${t(k)} — ${t("market.length")}`} type="number" inputMode="numeric" className="input !min-h-9" value={o.length || ""} onChange={(e) => setOffers(k, (l) => l.map((x, j) => (j === i ? { ...x, length: num(e.target.value) } : x)))} />
                          <input aria-label={`${t(k)} — ${t("market.price")}`} type="number" inputMode="numeric" className="input !min-h-9" value={o.price || ""} onChange={(e) => setOffers(k, (l) => l.map((x, j) => (j === i ? { ...x, price: num(e.target.value) } : x)))} />
                          <button type="button" className="btn-danger !min-h-9 !px-2" aria-label={t("market.removeOffer")} title={t("market.removeOffer")} onClick={() => setOffers(k, (l) => l.filter((_, j) => j !== i))}>
                            <Trash2 size={14} aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button type="button" className="btn-secondary !min-h-8 mt-2 !px-2.5 text-xs" disabled={offers.length >= 8} onClick={() => setOffers(k, (l) => [...l, { length: 6000, price: 0 }])}>
                      <Plus size={14} aria-hidden />
                      {t("market.add")}
                    </button>
                  </section>
                );
              })}
            </div>
            <p className="border-t border-line px-3 py-2 text-xs text-muted">{t("sim.barsHint")}</p>
          </details>
        </div>
      )}
    </section>
  );
}
