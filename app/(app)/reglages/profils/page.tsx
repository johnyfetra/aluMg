"use client";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Field, Switch } from "@/components/ui";
import { fmt, meters } from "@/lib/calc";
import { useSettings } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { FINISHES, FINISH_GROUPS, type FinishId, type Market, type Offer, PROFILE_KEYS, RANGES, type Settings, finishMarkup, finishOn, groupMarkup, profileOn, rangeOn } from "@/lib/model";

export default function MarketPage() {
  const { settings } = useSettings();
  return settings ? <Form initial={settings} /> : null;
}

const toggle = <V,>(list: V[] | undefined, v: V, on: boolean) => (on ? (list ?? []).filter((x) => x !== v) : [...(list ?? []).filter((x) => x !== v), v]); // on = devient disponible

// Catalogue des fournisseurs : ce que le menuisier peut acheter. Tout est disponible par défaut ; on ne stocke que ce qui manque.
function Form({ initial }: { initial: Settings }) {
  const { t } = useI18n();
  const { save } = useSettings();
  const [m, setM] = useState<Market>(initial.market);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const setOffers = (key: string, fn: (o: Offer[]) => Offer[]) => setM((cur) => ({ ...cur, offers: { ...cur.offers, [key]: fn(cur.offers[key] ?? []) } }));
  const setOff = (patch: NonNullable<Market["off"]>) => setM((cur) => ({ ...cur, off: { ...cur.off, ...patch } }));
  const num = (v: string) => Number(v) || 0;
  const rangesOn = RANGES.filter((r) => rangeOn(m, r)).length;
  const colorsOn = FINISHES.filter((f) => finishOn(m, f.id)).length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save({ ...initial, market: m });
      setMsg({ ok: true, text: t("market.saved") });
    } catch {
      setMsg({ ok: false, text: t("common.error") });
    }
  };

  const setPct = (id: FinishId, v: string) =>
    setM((cur) => {
      const next = { ...cur.finishPct };
      if (v.trim() === "") delete next[id];
      else next[id] = Number(v) || 0;
      return { ...cur, finishPct: next };
    });

  return (
    <form onSubmit={submit} className="space-y-6">
      <Link href="/reglages" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        <ArrowLeft size={16} aria-hidden />
        {t("market.back")}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("market.title")}</h1>
        <button type="submit" className="btn-primary">
          {t("settings.save")}
        </button>
      </div>
      <p className="max-w-3xl text-sm text-muted">{t("market.hint")}</p>
      <p role="status" className={`text-sm font-medium ${msg?.ok ? "text-ok" : "text-danger"}`}>
        {msg?.text}
      </p>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <section className="card space-y-3" aria-labelledby="h-rg">
          <h2 id="h-rg" className="text-lg font-semibold">{t("market.sec.ranges")}</h2>
          <p className="text-xs text-muted">{t("market.rangeBase")}</p>
          <ul className="divide-y divide-line">
            {RANGES.map((r) => {
              const on = rangeOn(m, r);
              return (
                <li key={r} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1 font-medium">{t(`range.${r}`)}</span>
                  {r === "europeen" && (
                    <label className="flex items-center gap-1.5 text-sm text-muted">
                      <span className="sr-only">{t("market.rangeMarkup")}</span>
                      <input type="number" aria-label={t("market.rangeMarkup")} className="input !min-h-9 !w-20 !py-1" value={m.rangeMarkup} onChange={(e) => setM({ ...m, rangeMarkup: num(e.target.value) })} />%
                    </label>
                  )}
                  <Switch checked={on} disabled={on && rangesOn === 1} label={`${t(`range.${r}`)} — ${t(on ? "market.available" : "market.unavailable")}`} onChange={(v) => setOff({ ranges: toggle(m.off?.ranges, r, v) })} />
                </li>
              );
            })}
          </ul>
          {(rangesOn === 1 || colorsOn === 1) && <p className="text-xs text-warn">{t("market.keepOne")}</p>}
        </section>

        <section className="card space-y-3" aria-labelledby="h-co">
          <h2 id="h-co" className="text-lg font-semibold">{t("market.sec.colors")}</h2>
          <p className="text-xs text-muted">{t("market.colorsHint")}</p>
          <div className="grid gap-x-6 gap-y-4 md:grid-cols-3">
            {FINISH_GROUPS.map(([group, label]) => (
              <div key={group} className="space-y-1">
                <h3 className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
                  {t(label)}
                  {group !== "laque" && (
                    <label className="flex items-center gap-1 normal-case tracking-normal">
                      <span className="sr-only">{t("market.defaultMarkup")} — {t(label)}</span>
                      <input
                        type="number"
                        title={t("market.defaultMarkup")}
                        className="input !min-h-8 !w-16 !px-2 !py-0.5 text-xs"
                        value={m.finishMarkup[group as "anodise" | "fauxbois"]}
                        onChange={(e) => setM({ ...m, finishMarkup: { ...m.finishMarkup, [group]: num(e.target.value) } })}
                      />
                      %
                    </label>
                  )}
                </h3>
                <ul className="divide-y divide-line">
                  {FINISHES.filter((f) => f.group === group).map((f) => {
                    const on = finishOn(m, f.id);
                    return (
                      <li key={f.id} className={`flex items-center gap-2 py-1.5 ${on ? "" : "opacity-60"}`}>
                        <span aria-hidden className="size-5 shrink-0 rounded-full border border-black/20" style={{ background: f.hex }} />
                        <span className="min-w-0 flex-1 truncate text-sm">{t(f.label)}</span>
                        <input
                          type="number"
                          aria-label={`${t(f.label)} — ${t("market.markupPct")}`}
                          placeholder={String(groupMarkup(m, f.id))}
                          className="input !min-h-8 !w-16 !px-2 !py-0.5 text-xs"
                          value={m.finishPct?.[f.id] ?? ""}
                          onChange={(e) => setPct(f.id, e.target.value)}
                          disabled={!on}
                          title={`${t("market.markupPct")} : ${finishMarkup(m, f.id)} %`}
                        />
                        <Switch checked={on} disabled={on && colorsOn === 1} label={`${t(f.label)} — ${t(on ? "market.available" : "market.unavailable")}`} onChange={(v) => setOff({ finishes: toggle(m.off?.finishes, f.id, v) })} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>

      <h2 className="text-lg font-semibold">{t("market.sec.profiles")}</h2>
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {PROFILE_KEYS.map((k) => {
          const offers = m.offers[k] ?? [];
          const on = profileOn(m, k);
          return (
            <section key={k} className={`card !p-4 ${on ? "" : "opacity-70"}`} aria-labelledby={`h-${k}`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 id={`h-${k}`} className="font-semibold">
                  {t(k)}
                </h3>
                <Switch checked={on} label={`${t(k)} — ${t("market.profileSold")}`} onChange={(v) => setOff({ profiles: toggle(m.off?.profiles, k as string, v) })} />
              </div>
              <ul className="space-y-2">
                {offers.map((o, i) => (
                  <li key={i} className={`grid grid-cols-[1fr_1fr_auto_auto] items-end gap-2 ${o.off ? "opacity-60" : ""}`}>
                    <Field htmlFor={`${k}-l${i}`} label={t("market.length")} hint={meters(o.length)}>
                      <input id={`${k}-l${i}`} type="number" inputMode="numeric" className="input !min-h-10" value={o.length || ""} onChange={(e) => setOffers(k, (list) => list.map((x, j) => (j === i ? { ...x, length: num(e.target.value) } : x)))} />
                    </Field>
                    <Field htmlFor={`${k}-p${i}`} label={t("market.price")} hint={`${fmt(Math.round(o.length ? (o.price / o.length) * 1000 : 0))} ${t("market.pricePerM")}`}>
                      <input id={`${k}-p${i}`} type="number" inputMode="numeric" className="input !min-h-10" value={o.price || ""} onChange={(e) => setOffers(k, (list) => list.map((x, j) => (j === i ? { ...x, price: num(e.target.value) } : x)))} />
                    </Field>
                    <div className="mb-6 self-end">
                      <Switch checked={!o.off} label={`${meters(o.length)} — ${t("market.barAvailable")}`} onChange={(v) => setOffers(k, (list) => list.map((x, j) => (j === i ? { ...x, off: v ? undefined : true } : x)))} />
                    </div>
                    <button type="button" className="btn-danger mb-5 !px-3" aria-label={t("market.removeOffer")} title={t("market.removeOffer")} onClick={() => setOffers(k, (list) => list.filter((_, j) => j !== i))}>
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn-secondary mt-3" disabled={offers.length >= 8} onClick={() => setOffers(k, (list) => [...list, { length: 6000, price: 0 }])}>
                <Plus size={16} aria-hidden />
                {t("market.add")}
              </button>
            </section>
          );
        })}
      </div>
    </form>
  );
}
