"use client";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Switch } from "./ui";
import { fmt } from "@/lib/calc";
import type { T } from "@/lib/i18n";
import { ACCESSORIES, DEFAULT_MARKET, GLASSES, GLASS_PRICE_DEFAULTS, type Market, type Offer, PROFILE_KEYS, profileOn } from "@/lib/model";

// Champ numérique avec son unité à droite : on sait toujours ce qu'on saisit.
export function NumField({ value, onChange, unit, label, width = "w-full" }: { value: number | string; onChange: (v: number) => void; unit: string; label: string; width?: string }) {
  return (
    <span className={`relative block ${width}`}>
      <input type="number" inputMode="decimal" aria-label={label} className="input !min-h-10 !pr-11 text-right tabular-nums" value={value === 0 ? "" : value} placeholder="0" onChange={(e) => onChange(Number(e.target.value) || 0)} />
      <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted">{unit}</span>
    </span>
  );
}

const perM = (o: Offer) => (o.length ? Math.round((o.price / o.length) * 1000) : 0);

// Liste des profilés : un seul ouvert à la fois. Chaque profilé a ses longueurs de barre et le prix de chaque barre.
export function ProfilesEditor({ market, onChange, t }: { market: Market; onChange: (m: Market) => void; t: T }) {
  const [open, setOpen] = useState<string | null>(null);
  const setOffers = (key: string, fn: (o: Offer[]) => Offer[]) => onChange({ ...market, offers: { ...market.offers, [key]: fn(market.offers[key] ?? []) } });
  const setSold = (key: string, sold: boolean) => {
    const list = (market.off?.profiles ?? []).filter((x) => x !== key);
    onChange({ ...market, off: { ...market.off, profiles: sold ? list : [...list, key] } });
  };

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {PROFILE_KEYS.map((k) => {
        const offers = market.offers[k] ?? [];
        const sold = profileOn(market, k);
        const usable = offers.filter((o) => !o.off && o.length > 0);
        const best = usable.length ? Math.min(...usable.map(perM)) : 0;
        const isOpen = open === k;
        return (
          <li key={k} className={sold ? "" : "bg-surface-2/40"}>
            <div className="flex items-center gap-3 px-4 py-3">
              <button type="button" aria-expanded={isOpen} aria-controls={`pf-${k}`} onClick={() => setOpen(isOpen ? null : k)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <ChevronDown size={18} aria-hidden className={`shrink-0 text-muted transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                <span className="min-w-0">
                  <span className="block font-semibold">{t(k)}</span>
                  <span className="block truncate text-sm text-muted">{t(`${k}.desc` as "pf.dormant.desc")}</span>
                </span>
              </button>
              <span className="hidden shrink-0 text-right text-sm sm:block">
                {sold ? (
                  usable.length ? (
                    <>
                      <span className="block font-medium tabular-nums">{usable.length === 1 ? t("cat.bar.one") : `${usable.length} ${t("cat.bar.many")}`}</span>
                      <span className="block text-xs text-muted tabular-nums">{t("cat.bar.from")} {fmt(best)} {t("cat.unit.ml")}</span>
                    </>
                  ) : (
                    <span className="text-xs font-medium text-warn">{t("cat.bar.none")}</span>
                  )
                ) : (
                  <span className="text-xs text-muted">{t("cat.notSold")}</span>
                )}
              </span>
              <Switch checked={sold} label={`${t(k)}, ${t("cat.sold")}`} onChange={(v) => setSold(k, v)} />
            </div>

            {isOpen && (
              <div id={`pf-${k}`} className="space-y-2 border-t border-line bg-surface-2/40 px-4 py-4 sm:pl-12">
                <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem_4.5rem_2.5rem] items-end gap-3 px-1 text-xs font-semibold text-muted sm:grid">
                  <span>{t("cat.bar.length")}</span>
                  <span>{t("cat.bar.price")}</span>
                  <span>{t("cat.bar.perM")}</span>
                  <span className="text-center">{t("cat.bar.stock")}</span>
                  <span />
                </div>
                {offers.map((o, i) => {
                  const isBest = !o.off && o.length > 0 && perM(o) === best && usable.length > 1;
                  return (
                    <div key={i} className={`grid grid-cols-2 items-center gap-3 rounded-xl border border-line bg-surface p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem_4.5rem_2.5rem] sm:border-0 sm:bg-transparent sm:p-0 ${o.off ? "opacity-60" : ""}`}>
                      <NumField label={`${t(k)}, ${t("cat.bar.length")}`} unit="mm" value={o.length} onChange={(v) => setOffers(k, (l) => l.map((x, j) => (j === i ? { ...x, length: v } : x)))} />
                      <NumField label={`${t(k)}, ${t("cat.bar.price")}`} unit="Ar" value={o.price} onChange={(v) => setOffers(k, (l) => l.map((x, j) => (j === i ? { ...x, price: v } : x)))} />
                      <span className="flex flex-col items-start gap-0.5 text-sm tabular-nums">
                        <span>{fmt(perM(o))} <span className="text-xs text-muted">Ar/m</span></span>
                        {isBest && <span className="rounded-full bg-good/15 px-2 py-0.5 text-[11px] font-semibold text-ok">{t("cat.bar.best")}</span>}
                      </span>
                      <span className="flex justify-center">
                        <Switch checked={!o.off} label={`${o.length} mm, ${t("cat.bar.stock")}`} onChange={(v) => setOffers(k, (l) => l.map((x, j) => (j === i ? { ...x, off: v ? undefined : true } : x)))} />
                      </span>
                      <button type="button" className="btn-danger !min-h-10 !px-2.5" aria-label={t("cat.bar.remove")} title={t("cat.bar.remove")} onClick={() => setOffers(k, (l) => l.filter((_, j) => j !== i))}>
                        <Trash2 size={15} aria-hidden />
                      </button>
                    </div>
                  );
                })}
                <button type="button" className="btn-secondary !min-h-9" disabled={offers.length >= 8} onClick={() => setOffers(k, (l) => [...l, { length: 6000, price: 0 }])}>
                  <Plus size={15} aria-hidden />
                  {t("cat.bar.add")}
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function PriceRow({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-4 px-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span className="w-44 shrink-0">{children}</span>
    </li>
  );
}

// Accessoires : un prix par ligne, avec la règle de quantité en clair.
export function AccessoriesEditor({ market, onChange, t }: { market: Market; onChange: (m: Market) => void; t: T }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {ACCESSORIES.map((a) => (
        <PriceRow key={a.key} title={t(a.key)} hint={t(`${a.key}.use` as "acc.handle.use")}>
          <NumField label={`${t(a.key)}, ${t("cat.price")}`} unit={a.unit === "ml" ? "Ar/m" : "Ar"} value={market.accessories?.[a.key] ?? a.def} onChange={(v) => onChange({ ...market, accessories: { ...market.accessories, [a.key]: v } })} />
        </PriceRow>
      ))}
      <PriceRow title={t("cat.panel")} hint={t("cat.panel.hint")}>
        <NumField label={`${t("cat.panel")}, ${t("cat.price")}`} unit="Ar/m²" value={market.panel ?? DEFAULT_MARKET.panel ?? 0} onChange={(v) => onChange({ ...market, panel: v })} />
      </PriceRow>
      <PriceRow title={t("cat.glassWaste")} hint={t("cat.glassWaste.hint")}>
        <NumField label={t("cat.glassWaste")} unit="%" value={market.glassWaste ?? DEFAULT_MARKET.glassWaste ?? 0} onChange={(v) => onChange({ ...market, glassWaste: Math.min(100, v) })} />
      </PriceRow>
    </ul>
  );
}

export function GlassEditor({ market, onChange, t }: { market: Market; onChange: (m: Market) => void; t: T }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {GLASSES.map((g) => (
        <PriceRow key={g.id} title={t(g.label)}>
          <NumField label={`${t(g.label)}, ${t("cat.price")}`} unit="Ar/m²" value={market.glass?.[g.id] ?? GLASS_PRICE_DEFAULTS[g.id] ?? 0} onChange={(v) => onChange({ ...market, glass: { ...market.glass, [g.id]: v } })} />
        </PriceRow>
      ))}
    </ul>
  );
}
