"use client";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Field } from "@/components/ui";
import { fmt, meters } from "@/lib/calc";
import { useSettings } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { type Market, type Offer, PROFILE_KEYS, type Settings } from "@/lib/model";

export default function MarketPage() {
  const { settings } = useSettings();
  return settings ? <Form initial={settings} /> : null;
}

function Form({ initial }: { initial: Settings }) {
  const { t } = useI18n();
  const { save } = useSettings();
  const [m, setM] = useState<Market>(initial.market);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const setOffers = (key: string, fn: (o: Offer[]) => Offer[]) => setM((cur) => ({ ...cur, offers: { ...cur.offers, [key]: fn(cur.offers[key] ?? []) } }));
  const num = (v: string) => Number(v) || 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save({ ...initial, market: m });
      setMsg({ ok: true, text: t("market.saved") });
    } catch {
      setMsg({ ok: false, text: t("common.error") });
    }
  };

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

      <section className="card space-y-4" aria-labelledby="h-mk">
        <h2 id="h-mk" className="text-lg font-semibold">
          {t("market.markups")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field htmlFor="rm" label={t("market.rangeMarkup")}>
            <input id="rm" type="number" className="input" value={m.rangeMarkup} onChange={(e) => setM({ ...m, rangeMarkup: num(e.target.value) })} />
          </Field>
          <Field htmlFor="fa" label={t("market.finishAnodise")}>
            <input id="fa" type="number" className="input" value={m.finishMarkup.anodise} onChange={(e) => setM({ ...m, finishMarkup: { ...m.finishMarkup, anodise: num(e.target.value) } })} />
          </Field>
          <Field htmlFor="ff" label={t("market.finishFauxbois")}>
            <input id="ff" type="number" className="input" value={m.finishMarkup.fauxbois} onChange={(e) => setM({ ...m, finishMarkup: { ...m.finishMarkup, fauxbois: num(e.target.value) } })} />
          </Field>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {PROFILE_KEYS.map((k) => {
          const offers = m.offers[k] ?? [];
          return (
            <section key={k} className="card !p-4" aria-labelledby={`h-${k}`}>
              <h2 id={`h-${k}`} className="mb-3 font-semibold">
                {t(k)}
              </h2>
              <ul className="space-y-2">
                {offers.map((o, i) => (
                  <li key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                    <Field htmlFor={`${k}-l${i}`} label={t("market.length")} hint={meters(o.length)}>
                      <input id={`${k}-l${i}`} type="number" inputMode="numeric" className="input" value={o.length || ""} onChange={(e) => setOffers(k, (list) => list.map((x, j) => (j === i ? { ...x, length: num(e.target.value) } : x)))} />
                    </Field>
                    <Field htmlFor={`${k}-p${i}`} label={t("market.price")} hint={`${fmt(Math.round(o.length ? (o.price / o.length) * 1000 : 0))} Ar/m`}>
                      <input id={`${k}-p${i}`} type="number" inputMode="numeric" className="input" value={o.price || ""} onChange={(e) => setOffers(k, (list) => list.map((x, j) => (j === i ? { ...x, price: num(e.target.value) } : x)))} />
                    </Field>
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
