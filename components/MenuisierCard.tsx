"use client";
import { ArrowUpRight, BadgeCheck, Hammer, Images, MapPin } from "lucide-react";
import Link from "next/link";
import { Avatar, Stars } from "./ui";
import { useI18n } from "@/lib/i18n";
import type { DirectoryEntry } from "@/lib/profiles";

// Carte d'un menuisier : photo de couverture (sa dernière réalisation), logo, note, spécialités, chiffres clés.
export default function MenuisierCard({ m }: { m: DirectoryEntry }) {
  const { t } = useI18n();
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary/30 via-surface-2 to-c2/25">
        {m.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.cover} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
        {m.verified && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-emerald-700 shadow">
            <BadgeCheck size={14} aria-hidden />
            {t("dir.verified")}
          </span>
        )}
        {m.reviews > 0 && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
            <span aria-hidden style={{ color: "#f5a524" }}>★</span>
            {m.rating.toFixed(1)}
          </span>
        )}
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
          <Images size={12} aria-hidden />
          {m.portfolio}
        </span>
        {m.owner.photo && (
          <span className="absolute -bottom-5 right-4 z-10 rounded-full bg-surface p-0.5 shadow-md" title={m.owner.name}>
            <Avatar name={m.owner.name} src={m.owner.photo} size={44} round />
          </span>
        )}
      </div>

      <div className="relative flex flex-1 flex-col gap-3 px-5 pb-5 pt-4">
        <div className="flex items-start gap-3">
          <div className="-mt-9 rounded-xl bg-surface p-1 shadow-md ring-1 ring-black/5">
            <Avatar name={m.name} src={m.logo} size={52} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="truncate text-lg font-bold leading-tight">
              <Link href={`/menuisiers/${m.slug}`} className="after:absolute after:inset-0 after:z-0 focus-visible:outline-offset-4">
                {m.name}
              </Link>
            </h3>
            {m.city && (
              <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
                <MapPin size={13} aria-hidden />
                {m.city}
              </p>
            )}
          </div>
        </div>

        <p className="flex items-center gap-2 text-sm">
          {m.reviews > 0 ? (
            <>
              <Stars value={m.rating} label={`${m.rating} ${t("mp.outOf5")}`} />
              <span className="text-muted">
                {m.reviews} {t("dir.reviews")}
              </span>
            </>
          ) : (
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted">{t("dir.noReviews")}</span>
          )}
        </p>

        {m.bio && <p className="line-clamp-2 text-sm leading-relaxed text-muted">{m.bio}</p>}

        <ul className="flex flex-wrap gap-1.5">
          {m.specialties.slice(0, 3).map((s) => (
            <li key={s} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {t(`spec.${s as "fenetres"}`)}
            </li>
          ))}
          {m.specialties.length > 3 && <li className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">+{m.specialties.length - 3}</li>}
        </ul>

        <div className="mt-auto flex items-center justify-between border-t border-line pt-3 text-sm">
          <p className="flex items-center gap-1.5 text-muted">
            <Hammer size={14} aria-hidden />
            <span>
              <strong className="text-ink">{m.completed}</strong> {t("dir.completed")}
            </span>
          </p>
          <span className="inline-flex items-center gap-1 font-semibold text-primary">
            {t("dir.viewProfile")}
            <ArrowUpRight size={16} aria-hidden className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </article>
  );
}
