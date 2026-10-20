"use client";
import { ArrowLeft, BadgeCheck, CalendarDays, Hammer, Images, MapPin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Lightbox from "./Lightbox";
import { Avatar, Stars } from "./ui";
import { useMenuisier, useSession } from "@/lib/client";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import type { PortfolioItem } from "@/lib/profiles";

export default function MenuisierProfile({ slug }: { slug: string }) {
  const { t, locale } = useI18n();
  const { data: m, error, isLoading } = useMenuisier(slug);
  const { data: me } = useSession();
  const [open, setOpen] = useState<{ item: PortfolioItem; i: number } | null>(null);
  const date = (iso: string) => new Date(iso).toLocaleDateString(DATE_LOCALE[locale], { year: "numeric", month: "long" });

  if (isLoading) return null;
  if (error || !m) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-muted">{t("mp.notFound")}</p>
        <Link href="/menuisiers" className="btn-primary mt-4">
          {t("mp.back")}
        </Link>
      </div>
    );
  }

  const next = `/espace-client/nouvelle?menuisier=${m.slug}`;
  const total = m.reviews || 1;

  return (
    <div className="mx-auto w-full max-w-[110rem] px-4 py-8 sm:px-8 xl:px-10">
      <Link href="/menuisiers" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        <ArrowLeft size={16} aria-hidden />
        {t("mp.back")}
      </Link>

      <header className="card relative overflow-hidden !p-0">
        <div className="h-32 bg-gradient-to-br from-primary/30 via-surface-2 to-c2/25 sm:h-44">
          {m.cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.cover} alt="" className="h-full w-full object-cover opacity-60" />
          )}
        </div>
        <div className="flex flex-wrap items-end gap-5 px-6 pb-6">
          <div className="-mt-12 rounded-2xl bg-surface p-1.5 shadow-md">
            <Avatar name={m.name} src={m.logo} size={88} />
          </div>
          <div className="min-w-0 flex-1 pt-3">
            <h1 className="flex flex-wrap items-center gap-2 text-3xl font-extrabold tracking-tight">
              {m.name}
              {m.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-good/15 px-2.5 py-1 text-xs font-semibold text-ok" title={t("mp.verifiedHint")}>
                  <BadgeCheck size={14} aria-hidden />
                  {t("dir.verified")}
                </span>
              )}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              {m.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} aria-hidden />
                  {m.city}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={14} aria-hidden />
                {t("mp.since")} {date(m.since)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Hammer size={14} aria-hidden />
                {m.completed} {t("dir.completed")}
              </span>
              <span className="inline-flex items-center gap-1">
                <Images size={14} aria-hidden />
                {m.portfolio} {t("dir.portfolio")}
              </span>
            </p>
          </div>
          <div className="text-right">
            {m.reviews > 0 ? (
              <>
                <p className="text-3xl font-extrabold leading-none">{m.rating.toFixed(1)}</p>
                <Stars value={m.rating} size={18} label={`${m.rating} ${t("mp.outOf5")}`} />
                <p className="text-xs text-muted">
                  {m.reviews} {t("dir.reviews")}
                </p>
              </>
            ) : (
              <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-muted">{t("dir.noReviews")}</span>
            )}
          </div>
        </div>
      </header>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <section className="card" aria-labelledby="h-about">
            <h2 id="h-about" className="mb-2 text-lg font-semibold">
              {t("mp.about")}
            </h2>
            <p className="whitespace-pre-line text-muted">{m.bio || t("mp.noBio")}</p>
            {m.specialties.length > 0 && (
              <>
                <h3 className="mb-2 mt-5 text-sm font-semibold">{t("mp.specialties")}</h3>
                <ul className="flex flex-wrap gap-2">
                  {m.specialties.map((s) => (
                    <li key={s} className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                      {t(`spec.${s as "fenetres"}`)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="card" aria-labelledby="h-port">
            <h2 id="h-port" className="mb-4 text-lg font-semibold">
              {t("mp.portfolio")}
            </h2>
            {m.items.length === 0 ? (
              <p className="text-sm text-muted">{t("mp.noPortfolio")}</p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {m.items.map((it) => (
                  <li key={it.id}>
                    <button type="button" onClick={() => setOpen({ item: it, i: 0 })} className="group block w-full overflow-hidden rounded-xl border border-line bg-surface text-left transition-shadow hover:shadow-md" aria-label={`${t("mp.openPhoto")} : ${it.title}`}>
                      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.thumb || it.images[0]} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        {it.images.length > 1 && (
                          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                            <Images size={12} aria-hidden />
                            {it.images.length}
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-semibold">{it.title}</p>
                        <p className="text-xs text-muted">{[it.category && t(`spec.${it.category as "fenetres"}`), it.year].filter(Boolean).join(" · ")}</p>
                        {it.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{it.description}</p>}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card" aria-labelledby="h-rev">
            <h2 id="h-rev" className="mb-4 text-lg font-semibold">
              {t("mp.reviews")}
            </h2>
            {m.reviewList.length === 0 ? (
              <p className="text-sm text-muted">{t("mp.noReviews")}</p>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
                <div>
                  <p className="text-4xl font-extrabold">{m.rating.toFixed(1)}</p>
                  <Stars value={m.rating} size={18} label={`${m.rating} ${t("mp.outOf5")}`} />
                  <ul className="mt-3 space-y-1.5" aria-label={t("mp.reviews")}>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <li key={n} className="flex items-center gap-2 text-xs">
                        <span className="w-4 text-right">{n}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                          <span className="block h-full rounded-full" style={{ width: `${(m.distribution[n - 1] / total) * 100}%`, background: "#f5a524" }} />
                        </span>
                        <span className="w-5 text-muted">{m.distribution[n - 1]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <ul className="space-y-4">
                  {m.reviewList.map((r, i) => (
                    <li key={i} className="rounded-xl bg-surface-2 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="flex items-center gap-2 text-sm font-semibold">
                          <Stars value={r.rating} label={`${r.rating} ${t("mp.outOf5")}`} />
                          {r.client}
                        </p>
                        <p className="text-xs text-muted">{date(r.at)}</p>
                      </div>
                      {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        <aside className="card space-y-3 xl:sticky xl:top-24" aria-label={t("mp.requestQuote")}>
          {m.owner.name && (
            <div className="-mx-1 mb-1 flex items-center gap-3 rounded-xl bg-surface-2 p-3">
              <Avatar name={m.owner.name} src={m.owner.photo} size={52} round />
              <div>
                <p className="text-xs text-muted">{t("mp.contact")}</p>
                <p className="font-semibold">{m.owner.name}</p>
              </div>
            </div>
          )}
          <h2 className="text-lg font-semibold">{t("mp.requestQuote")}</h2>
          <p className="text-sm text-muted">{t("mp.requestHint")}</p>
          {me?.role === "client" ? (
            <Link href={next} className="btn-primary w-full">
              {t("mp.requestQuote")}
            </Link>
          ) : !me ? (
            <>
              <Link href={`/connexion?next=${encodeURIComponent(next)}`} className="btn-primary w-full">
                {t("mp.loginToRequest")}
              </Link>
              <Link href={`/inscription?role=client&next=${encodeURIComponent(next)}`} className="btn-secondary w-full">
                {t("mp.createAccount")}
              </Link>
            </>
          ) : (
            <p role="note" className="rounded-lg bg-surface-2 p-3 text-sm text-muted">
              {t("mp.needClient")}
            </p>
          )}
        </aside>
      </div>

      {open && <Lightbox images={open.item.images} index={open.i} onIndex={(i) => setOpen({ ...open, i })} onClose={() => setOpen(null)} label={open.item.title} />}
    </div>
  );
}
