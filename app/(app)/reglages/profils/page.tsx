"use client";
import { ArrowLeft, Check, Droplet, Hammer, Layers, Palette } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AccessoriesEditor, GlassEditor, NumField, ProfilesEditor } from "@/components/Catalog";
import { Switch } from "@/components/ui";
import { useSettings } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { FINISHES, FINISH_GROUPS, type FinishId, type Market, RANGES, type Settings, finishMarkup, finishOn, groupMarkup, rangeOn } from "@/lib/model";

export default function MarketPage() {
  const { settings } = useSettings();
  return settings ? <Form initial={settings} /> : null;
}

const toggle = <V,>(list: V[] | undefined, v: V, on: boolean) => (on ? (list ?? []).filter((x) => x !== v) : [...(list ?? []).filter((x) => x !== v), v]); // on = devient disponible

const TABS = [
  ["profiles", "cat.tab.profiles", Layers],
  ["accessories", "cat.tab.accessories", Hammer],
  ["glass", "cat.tab.glass", Droplet],
  ["colors", "cat.tab.colors", Palette],
] as const;

// Catalogue des fournisseurs : ce que le menuisier peut acheter, et à quel prix. Tout est disponible par défaut ; on ne stocke que ce qui manque.
function Form({ initial }: { initial: Settings }) {
  const { t } = useI18n();
  const { save } = useSettings();
  const [m, setM] = useState<Market>(initial.market);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("profiles");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = JSON.stringify(m) !== JSON.stringify(initial.market);

  const setOff = (patch: NonNullable<Market["off"]>) => setM((cur) => ({ ...cur, off: { ...cur.off, ...patch } }));
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{t("market.title")}</h1>
          <p className="max-w-3xl text-sm text-muted">{t("market.hint")}</p>
        </div>
        <div className="flex items-center gap-3">
          <p role="status" className={`text-sm font-medium ${msg?.ok ? "text-ok" : "text-danger"}`}>
            {msg?.ok && <Check size={15} aria-hidden className="mr-1 inline" />}
            {msg?.text}
          </p>
          <button type="submit" className="btn-primary" disabled={!dirty}>
            {t("settings.save")}
          </button>
        </div>
      </div>

      <div role="tablist" aria-label={t("market.title")} className="flex flex-wrap gap-1 rounded-2xl border border-line bg-surface p-1">
        {TABS.map(([id, label, Icon]) => (
          <button key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} onClick={() => setTab(id)} className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold sm:flex-none ${tab === id ? "bg-primary text-on-primary shadow-sm" : "text-muted hover:bg-surface-2 hover:text-ink"}`}>
            <Icon size={16} aria-hidden />
            {t(label)}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="space-y-4">
        {tab === "profiles" && (
          <>
            <p className="max-w-3xl text-sm text-muted">{t("cat.profiles.intro")}</p>
            <ProfilesEditor market={m} onChange={setM} t={t} />
          </>
        )}
        {tab === "accessories" && (
          <>
            <p className="max-w-3xl text-sm text-muted">{t("cat.acc.intro")}</p>
            <AccessoriesEditor market={m} onChange={setM} t={t} />
          </>
        )}
        {tab === "glass" && (
          <>
            <p className="max-w-3xl text-sm text-muted">{t("cat.glass.intro")}</p>
            <GlassEditor market={m} onChange={setM} t={t} />
          </>
        )}
        {tab === "colors" && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
            <section className="space-y-3" aria-labelledby="h-rg">
              <h2 id="h-rg" className="text-lg font-semibold">{t("market.sec.ranges")}</h2>
              <p className="text-sm text-muted">{t("market.rangeBase")}</p>
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {RANGES.map((r) => {
                  const on = rangeOn(m, r);
                  return (
                    <li key={r} className="flex items-center gap-3 px-4 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{t(`range.${r}`)}</span>
                        {r === "europeen" && <span className="block text-xs text-muted">{t("market.rangeMarkup")}</span>}
                      </span>
                      {r === "europeen" && <NumField label={t("market.rangeMarkup")} unit="%" width="w-24" value={m.rangeMarkup} onChange={(v) => setM({ ...m, rangeMarkup: v })} />}
                      <Switch checked={on} disabled={on && rangesOn === 1} label={`${t(`range.${r}`)} — ${t(on ? "market.available" : "market.unavailable")}`} onChange={(v) => setOff({ ranges: toggle(m.off?.ranges, r, v) })} />
                    </li>
                  );
                })}
              </ul>
              {(rangesOn === 1 || colorsOn === 1) && <p className="text-xs text-warn">{t("market.keepOne")}</p>}
            </section>

            <section className="space-y-3" aria-labelledby="h-co">
              <h2 id="h-co" className="text-lg font-semibold">{t("market.sec.colors")}</h2>
              <p className="text-sm text-muted">{t("market.colorsHint")}</p>
              <div className="grid gap-4 lg:grid-cols-3">
                {FINISH_GROUPS.map(([group, label]) => (
                  <div key={group} className="overflow-hidden rounded-2xl border border-line bg-surface">
                    <h3 className="flex items-center justify-between gap-2 border-b border-line bg-surface-2/60 px-4 py-2.5 text-sm font-semibold">
                      {t(label)}
                      {group !== "laque" && <NumField label={`${t("market.defaultMarkup")} — ${t(label)}`} unit="%" width="w-24" value={m.finishMarkup[group as "anodise" | "fauxbois"]} onChange={(v) => setM({ ...m, finishMarkup: { ...m.finishMarkup, [group]: v } })} />}
                    </h3>
                    <ul className="divide-y divide-line">
                      {FINISHES.filter((f) => f.group === group).map((f) => {
                        const on = finishOn(m, f.id);
                        return (
                          <li key={f.id} className={`flex items-center gap-3 px-4 py-2 ${on ? "" : "opacity-60"}`}>
                            <span aria-hidden className="size-5 shrink-0 rounded-full border border-black/20" style={{ background: f.hex }} />
                            <span className="min-w-0 flex-1 text-sm">{t(f.label)}</span>
                            <span className="relative block w-24">
                              <input type="number" aria-label={`${t(f.label)} — ${t("market.markupPct")}`} placeholder={String(groupMarkup(m, f.id))} disabled={!on} title={`${t("market.markupPct")} : ${finishMarkup(m, f.id)} %`} className="input !min-h-9 !pr-7 text-right text-sm tabular-nums" value={m.finishPct?.[f.id] ?? ""} onChange={(e) => setPct(f.id, e.target.value)} />
                              <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">%</span>
                            </span>
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
        )}
      </div>
    </form>
  );
}
