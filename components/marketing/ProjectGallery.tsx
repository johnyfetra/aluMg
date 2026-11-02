"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, MapPin } from "lucide-react";
import { usePublicWorks } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";
import { SPECIALTIES } from "@/lib/model";
import { EmptyState, ErrorState, LoadingState } from "../Feedback";
import Photo from "./Photo";

// Galerie publique des réalisations ; les filtres (catégorie, chantier) vivent dans l'adresse pour pouvoir être partagés.
export default function ProjectGallery({ limit, filters }: { limit?: number; filters?: boolean }) {
  const { t, locale } = useI18n();
  const c = marketing[locale];
  const router = useRouter();
  const sp = useSearchParams();
  const category = filters ? (sp.get("category") ?? "") : "";
  const project = filters ? (sp.get("project") ?? "") : "";
  const { data, error, isLoading, mutate } = usePublicWorks({ category, project });
  const { data: all } = usePublicWorks({});
  const set = (k: string, v: string) => {
    const q = new URLSearchParams(sp.toString());
    if (v) q.set(k, v); else q.delete(k);
    router.replace(`?${q}`, { scroll: false });
  };
  const present = new Set((all ?? []).map(w => w.category));
  const projects = [...new Set((all ?? []).map(w => w.project).filter(Boolean))].sort();
  const chip = (on: boolean) => `inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium transition-colors ${on ? "border-primary bg-primary text-white" : "border-line hover:bg-surface-2"}`;
  const works = (data ?? []).slice(0, limit);
  return <div>
    {filters && <div className="mb-8 space-y-4">
      <div role="group" aria-label={t("port.category")} className="flex flex-wrap gap-2">
        <button type="button" className={chip(!category)} aria-pressed={!category} onClick={() => set("category", "")}>{t("gal.all")}</button>
        {SPECIALTIES.filter(s => present.has(s) || s === category).map(s => <button key={s} type="button" className={chip(category === s)} aria-pressed={category === s} onClick={() => set("category", s)}>{t(`spec.${s}`)}</button>)}
      </div>
      {projects.length > 0 && <label className="flex flex-wrap items-center gap-3 text-sm text-muted">{t("gal.project")}
        <select className="input !min-h-10 !w-auto" value={project} onChange={e => set("project", e.target.value)}><option value="">{t("gal.projectAll")}</option>{projects.map(p => <option key={p} value={p}>{p}</option>)}</select>
      </label>}
      <p className="text-sm text-muted" aria-live="polite">{works.length} {t("gal.count")}</p>
    </div>}
    {error ? <ErrorState retry={() => { void mutate(); }} />
    : isLoading ? <LoadingState />
    : !works.length ? <EmptyState message={filters ? t("gal.none") : c.projectsEmpty}><Link href="/menuisiers" className="btn-secondary">{c.find}</Link></EmptyState>
    : <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{works.map(w => <article key={w.id} className="group reveal">
      <Link href={`/menuisiers/${w.menuisier.slug}#h-port`} className="block rounded-xl focus-visible:outline-offset-4">
        <div className="relative overflow-hidden rounded-xl"><Photo src={w.thumb} alt={w.title} grade className="aspect-[4/3] rounded-xl transition-transform duration-500 group-hover:scale-[1.03]" />
          {w.category && <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">{t(`spec.${w.category as "fenetres"}`)}</span>}
        </div>
        <h3 className="mt-4 font-semibold">{w.title}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          {w.project && <span>{w.project}</span>}
          {w.city && <span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden />{w.city}</span>}
        </p>
        <p className="mt-2 flex items-center gap-1 text-sm">{t("gal.by")} <strong className="font-semibold">{w.menuisier.name}</strong>{w.menuisier.verified && <BadgeCheck size={15} aria-label={t("dir.verified")} className="text-primary" />}</p>
      </Link>
    </article>)}</div>}
  </div>;
}
