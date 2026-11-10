"use client";
import { Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
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

// Liste des profilés, tout visible : pour chaque profilé, les barres vendues sur le marché (longueur en mètres, prix de la barre).
// Le calcul choisit seul les barres les moins chères pour chaque devis.
export function ProfilesEditor({ market, onChange, t }: { market: Market; onChange: (m: Market) => void; t: T }) {
  const setOffers = (key: string, fn: (o: Offer[]) => Offer[]) => onChange({ ...market, offers: { ...market.offers, [key]: fn(market.offers[key] ?? []) } });
  // modifier une barre la remet en vente (ancienne option « en stock »)
  const edit = (key: string, i: number, patch: Partial<Offer>) => setOffers(key, (l) => l.map((x, j) => (j === i ? { ...x, ...patch, off: undefined } : x)));
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
        return (
          <li key={k} className={`grid gap-3 px-4 py-3 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-center ${sold ? "" : "bg-surface-2/40"}`}>
            <div className="flex items-center gap-3">
              <Switch checked={sold} label={`${t(k)}, ${t("cat.sold")}`} onChange={(v) => setSold(k, v)} />
              <span className="min-w-0">
                <span className="block font-semibold">{t(k)}</span>
                <span className="block text-xs text-muted tabular-nums">{!sold ? t("cat.notSold") : usable.length ? `${t("cat.bar.from")} ${fmt(best)} ${t("cat.unit.ml")}` : <span className="text-warn">{t("cat.bar.none")}</span>}</span>
              </span>
            </div>
            {sold && (
              <div className="flex flex-wrap items-center gap-2">
                {offers.map((o, i) => (
                  <span key={i} className={`flex items-center gap-1 rounded-xl border border-line bg-surface-2/40 p-1 ${o.off ? "opacity-60" : ""}`}>
                    <NumField label={`${t(k)}, ${t("cat.bar.length")}`} unit="m" width="w-24" value={o.length / 1000} onChange={(v) => edit(k, i, { length: Math.round(v * 1000) })} />
                    <NumField label={`${t(k)}, ${t("cat.bar.price")}`} unit="Ar" width="w-36" value={o.price} onChange={(v) => edit(k, i, { price: v })} />
                    <button type="button" className="rounded-lg p-2 text-muted hover:bg-surface hover:text-danger" aria-label={`${t("cat.bar.remove")} ${o.length / 1000} m`} data-tooltip={t("cat.bar.remove")} onClick={() => setOffers(k, (l) => l.filter((_, j) => j !== i))}>
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </span>
                ))}
                <button type="button" className="btn-secondary !min-h-10 !px-3" disabled={offers.length >= 8} aria-label={`${t("cat.bar.add")}, ${t(k)}`} data-tooltip={t("cat.bar.add")} onClick={() => setOffers(k, (l) => [...l, { length: 6000, price: 0 }])}>
                  <Plus size={15} aria-hidden />
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
    <ul className="max-w-3xl divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
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
    <ul className="max-w-3xl divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {GLASSES.map((g) => (
        <PriceRow key={g.id} title={t(g.label)}>
          <NumField label={`${t(g.label)}, ${t("cat.price")}`} unit="Ar/m²" value={market.glass?.[g.id] ?? GLASS_PRICE_DEFAULTS[g.id] ?? 0} onChange={(v) => onChange({ ...market, glass: { ...market.glass, [g.id]: v } })} />
        </PriceRow>
      ))}
    </ul>
  );
}
