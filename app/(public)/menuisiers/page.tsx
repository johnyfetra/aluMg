"use client";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import MenuisierCard from "@/components/MenuisierCard";
import { useDirectory } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { SPECIALTIES } from "@/lib/model";

const EMPTY = { q: "", city: "", specialty: "", minRating: "", verified: "", sort: "rating" };

export default function Directory() {
  const { t } = useI18n();
  const [f, setF] = useState(EMPTY);
  const { data, isLoading } = useDirectory(f.sort === "rating" ? { ...f, sort: "" } : f);
  const set = (patch: Partial<typeof EMPTY>) => setF((cur) => ({ ...cur, ...patch }));
  const dirty = JSON.stringify(f) !== JSON.stringify(EMPTY);

  return (
    <div className="mx-auto w-full max-w-[110rem] px-4 py-10 sm:px-8 xl:px-10">
      <h1 className="text-3xl font-extrabold tracking-tight">{t("dir.title")}</h1>
      <p className="mt-2 max-w-2xl text-muted">{t("dir.subtitle")}</p>

      <form role="search" onSubmit={(e) => e.preventDefault()} className="card mt-6 space-y-4">
        <div className="relative">
          <Search size={18} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input type="search" aria-label={t("dir.search")} placeholder={t("dir.search")} className="input !pl-10" value={f.q} onChange={(e) => set({ q: e.target.value })} />
        </div>
        <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-1 text-sm font-medium">
            {t("dir.city")}
            <input className="input font-normal" value={f.city} onChange={(e) => set({ city: e.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-medium">
            {t("dir.specialty")}
            <select className="input font-normal" value={f.specialty} onChange={(e) => set({ specialty: e.target.value })}>
              <option value="">{t("dir.allSpecialties")}</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {t(`spec.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium">
            {t("dir.minRating")}
            <select className="input font-normal" value={f.minRating} onChange={(e) => set({ minRating: e.target.value })}>
              <option value="">{t("dir.any")}</option>
              {[4.5, 4, 3].map((r) => (
                <option key={r} value={r}>
                  ★ {r}+
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium">
            {t("dir.sort")}
            <select className="input font-normal" value={f.sort} onChange={(e) => set({ sort: e.target.value })}>
              {(["rating", "completed", "recent", "name"] as const).map((s) => (
                <option key={s} value={s}>
                  {t(`dir.sort.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-5" checked={f.verified === "1"} onChange={(e) => set({ verified: e.target.checked ? "1" : "" })} />
            {t("dir.verifiedOnly")}
          </label>
        </div>
      </form>

      <div className="mt-6 flex items-center justify-between gap-3" aria-live="polite">
        <p className="flex items-center gap-2 text-sm text-muted">
          <SlidersHorizontal size={16} aria-hidden />
          {isLoading && !data ? t("common.loading") : `${data?.length ?? 0} ${t("dir.results")}`}
        </p>
        {dirty && (
          <button type="button" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline" onClick={() => setF(EMPTY)}>
            <X size={14} aria-hidden />
            {t("dir.reset")}
          </button>
        )}
      </div>

      {data && data.length === 0 ? (
        <div className="card mt-4 py-14 text-center text-muted">{t("dir.empty")}</div>
      ) : (
        <div className="mt-4 grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {(data ?? []).map((m) => (
            <MenuisierCard key={m.slug} m={m} />
          ))}
        </div>
      )}
    </div>
  );
}
