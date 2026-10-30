"use client";
import { BadgeCheck, MapPin, Search, SlidersHorizontal, Star, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ErrorState } from "./Feedback";
import { marketing } from "@/lib/marketing";
import Photo from "./marketing/Photo";
import MenuisierCard from "./MenuisierCard";
import { useDirectory } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { SPECIALTIES } from "@/lib/model";
import Select from "./Select";

type F = { q: string; city: string; specialty: string; minRating: string; verified: string; sort: string };
const EMPTY: F = { q: "", city: "", specialty: "", minRating: "", verified: "", sort: "rating" };
const KEYS = Object.keys(EMPTY) as (keyof F)[];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-line pt-4 first:border-0 first:pt-0">
      <fieldset className="m-0 min-w-0 space-y-2.5 border-0 p-0">
        <legend className="mb-2.5 p-0 text-xs font-bold uppercase tracking-wider text-muted">{title}</legend>
        {children}
      </fieldset>
    </div>
  );
}

// Annuaire : panneau de filtres (collant sur ordinateur, tiroir sur mobile), puces des filtres actifs, résultats triables.
export default function Directory() {
  const { t, locale } = useI18n();
  const c = marketing[locale];
  const params = useSearchParams();
  const [f, setF] = useState<F>(() => Object.fromEntries(KEYS.map((k) => [k, params.get(k) ?? EMPTY[k]])) as F);
  const [open, setOpen] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const { data, isLoading, error, mutate } = useDirectory(Object.fromEntries(KEYS.map((k) => [k, k === "sort" && f.sort === "rating" ? "" : f[k]])));
  const { data: all = [] } = useDirectory({}); // sans filtre : sert à proposer les villes et à compter les spécialités
  const set = (patch: Partial<F>) => setF((cur) => ({ ...cur, ...patch }));

  // l'adresse reflète les filtres (lien partageable) sans recharger la page
  useEffect(() => {
    const qs = new URLSearchParams(KEYS.filter((k) => f[k] && f[k] !== EMPTY[k]).map((k) => [k, f[k]])).toString();
    history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  }, [f]);

  useEffect(() => {
    const d = drawer.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const cities = Object.entries(all.reduce<Record<string, number>>((a, m) => (m.city ? { ...a, [m.city]: (a[m.city] ?? 0) + 1 } : a), {})).sort((a, b) => b[1] - a[1]);
  const specCount = (s: string) => all.filter((m) => m.specialties.includes(s)).length;
  const chips = [
    f.q && { k: "q", label: `“${f.q}”` },
    f.city && { k: "city", label: f.city },
    f.specialty && { k: "specialty", label: t(`spec.${f.specialty as "fenetres"}`) },
    f.minRating && { k: "minRating", label: `★ ${f.minRating}+` },
    f.verified && { k: "verified", label: t("dir.verified") },
  ].filter(Boolean) as { k: keyof F; label: string }[];

  const panel = (prefix: string) => (
    <div className="space-y-5">
      <Section title={t("dir.location")}>
        <div className="relative">
          <MapPin size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input !pl-9" list={`${prefix}-cities`} aria-label={t("dir.city")} placeholder={t("dir.allCities")} value={f.city} onChange={(e) => set({ city: e.target.value })} />
          <datalist id={`${prefix}-cities`}>
            {cities.map(([c]) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {cities.slice(0, 6).map(([c, n]) => (
            <button key={c} type="button" aria-pressed={f.city === c} onClick={() => set({ city: f.city === c ? "" : c })} className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${f.city === c ? "border-primary bg-primary text-on-primary" : "border-line hover:bg-surface-2"}`}>
              {c} <span className="opacity-60">{n}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title={t("dir.specialty")}>
        <div className="flex flex-wrap gap-1.5">
          {SPECIALTIES.map((s) => (
            <button key={s} type="button" aria-pressed={f.specialty === s} onClick={() => set({ specialty: f.specialty === s ? "" : s })} className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${f.specialty === s ? "border-primary bg-primary text-on-primary" : "border-line hover:bg-surface-2"}`}>
              {t(`spec.${s}`)} <span className="opacity-60">{specCount(s)}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title={t("dir.rating")}>
        <div role="radiogroup" aria-label={t("dir.rating")} className="space-y-1">
          {["", "4.5", "4", "3"].map((r) => (
            <label key={r} className={`flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm ${f.minRating === r ? "bg-primary/10 font-semibold" : "hover:bg-surface-2"}`}>
              <input type="radio" name={`${prefix}-minRating`} className="size-4 accent-[var(--primary)]" checked={f.minRating === r} onChange={() => set({ minRating: r })} />
              {r === "" ? (
                t("dir.any")
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Star size={14} aria-hidden fill="#f5a524" stroke="#f5a524" />
                  {r} {t("dir.andMore")}
                </span>
              )}
            </label>
          ))}
        </div>
      </Section>

      <Section title={t("dir.trust")}>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-surface-2">
          <input type="checkbox" role="switch" className="mt-0.5 size-5 accent-[var(--primary)]" checked={f.verified === "1"} onChange={(e) => set({ verified: e.target.checked ? "1" : "" })} />
          <span className="text-sm">
            <span className="flex items-center gap-1.5 font-semibold">
              <BadgeCheck size={15} aria-hidden className="text-ok" />
              {t("dir.verifiedOnly")}
            </span>
            <span className="text-xs text-muted">{t("dir.verifiedHelp")}</span>
          </span>
        </label>
      </Section>

      {chips.length > 0 && (
        <button type="button" className="btn-secondary w-full" onClick={() => setF({ ...EMPTY, sort: f.sort })}>
          <X size={16} aria-hidden />
          {t("dir.reset")}
        </button>
      )}
    </div>
  );

  return (
    <div>
      {/* bandeau : titre et recherche */}
      <section className="border-b border-line bg-bg">
        <div className="mx-auto w-full max-w-[86rem] px-4 py-10 sm:px-8 xl:px-10">
          <p className="eyebrow mb-4">{c.joiners}</p>
          <h1 className="max-w-3xl text-3xl font-medium tracking-tight sm:text-5xl">{t("dir.headline")}</h1>
          <p className="mt-2 max-w-2xl text-muted">{t("dir.subtitle")}</p>
          <figure className="mt-6 max-w-2xl"><Photo src="/brand/precision-aluminium.webp" alt={c.craftAlt} className="h-40 rounded-xl sm:h-48" position="center 55%" /><figcaption className="mt-2 text-xs text-muted">{c.editorial}</figcaption></figure>
          <form role="search" onSubmit={(e) => e.preventDefault()} className="mt-6 flex max-w-2xl items-center gap-2 rounded-full border border-line bg-surface p-1.5 pl-5 shadow-lg shadow-primary/5 focus-within:ring-2 focus-within:ring-primary">
            <Search size={18} aria-hidden className="text-muted" />
            <input type="search" aria-label={t("dir.search")} placeholder={t("dir.search")} className="h-10 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted" value={f.q} onChange={(e) => set({ q: e.target.value })} />
            {f.q && (
              <button type="button" className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label={t("dir.reset")} onClick={() => set({ q: "" })}>
                <X size={16} aria-hidden />
              </button>
            )}
          </form>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-[86rem] items-start gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[17.5rem_minmax(0,1fr)] xl:px-10">
        <aside className="card hidden !p-5 lg:sticky lg:top-24 lg:block" aria-label={t("dir.filters")}>
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
            <SlidersHorizontal size={16} aria-hidden />
            {t("dir.filters")}
          </h2>
          {panel("desktop")}
        </aside>

        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              {isLoading && !data ? t("common.loading") : (
                <>
                  <strong className="text-ink">{data?.length ?? 0}</strong> {t("dir.results")}
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-secondary lg:!hidden" onClick={() => setOpen(true)}>
                <SlidersHorizontal size={16} aria-hidden />
                {t("dir.filters")}
                {chips.length > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-on-primary">{chips.length}</span>}
              </button>
              <label className="flex items-center gap-2 text-sm">
                <span className="hidden text-muted sm:inline">{t("dir.sortBy")}</span>
                <Select className="!w-auto !min-h-10" value={f.sort} onChange={(v) => set({ sort: v })} aria-label={t("dir.sort")} options={(["rating", "completed", "recent", "name"] as const).map((s) => ({ value: s, label: t(`dir.sort.${s}`) }))} />
              </label>
            </div>
          </div>

          {chips.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label={t("dir.active")}>
              {chips.map((c) => (
                <li key={c.k}>
                  <button type="button" onClick={() => set({ [c.k]: "" })} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 py-1 pl-3 pr-2 text-xs font-semibold text-primary hover:bg-primary/20">
                    {c.label}
                    <X size={13} aria-label={t("common.remove")} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error ? <ErrorState retry={() => { void mutate(); }} /> : isLoading && !data ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label={t("common.loading")}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-96 animate-pulse rounded-2xl bg-surface-2" />
              ))}
            </div>
          ) : data && data.length === 0 ? (
            <div className="card py-16 text-center">
              <p className="mb-4 text-muted">{t("dir.empty")}</p>
              <button type="button" className="btn-primary" onClick={() => setF(EMPTY)}>
                {t("dir.reset")}
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {(data ?? []).map((m) => (
                <MenuisierCard key={m.slug} m={m} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* tiroir de filtres sur mobile */}
      <dialog ref={drawer} onClose={() => setOpen(false)} aria-label={t("dir.filters")} className="m-0 ml-auto h-full max-h-none w-[min(22rem,92vw)] max-w-none bg-surface p-0 text-ink backdrop:bg-black/50">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line p-4">
            <h2 className="font-bold">{t("dir.filters")}</h2>
            <button type="button" className="grid size-10 place-items-center rounded-lg hover:bg-surface-2" onClick={() => setOpen(false)} aria-label={t("menu.close")}>
              <X size={18} aria-hidden />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{panel("mobile")}</div>
          <div className="border-t border-line p-4">
            <button type="button" className="btn-primary w-full" onClick={() => setOpen(false)}>
              {data?.length ?? 0} {t("dir.results")}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
