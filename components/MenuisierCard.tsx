"use client";
import { BadgeCheck, Hammer, Images, MapPin } from "lucide-react";
import Link from "next/link";
import { Avatar, Stars } from "./ui";
import { useI18n } from "@/lib/i18n";
import type { DirectoryEntry } from "@/lib/profiles";

// Carte d'un menuisier dans l'annuaire : couverture (sa dernière réalisation), logo, note, spécialités, chiffres clés.
export default function MenuisierCard({ m }: { m: DirectoryEntry }) {
  const { t } = useI18n();
  return (
    <article className="group card flex flex-col overflow-hidden !p-0 transition-shadow hover:shadow-lg">
      <Link href={`/menuisiers/${m.slug}`} className="relative block h-40 overflow-hidden bg-gradient-to-br from-primary/25 via-surface-2 to-c2/20" tabIndex={-1} aria-hidden>
        {m.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.cover} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        )}
        {m.verified && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-surface/95 px-2.5 py-1 text-xs font-semibold text-ok shadow">
            <BadgeCheck size={14} aria-hidden />
            {t("dir.verified")}
          </span>
        )}
      </Link>
      <div className="relative z-10 -mt-7 flex flex-1 flex-col gap-3 px-5 pb-5">
        <div className="flex items-end gap-3">
          <div className="rounded-xl bg-surface p-1 shadow">
            <Avatar name={m.name} src={m.logo} size={52} />
          </div>
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold leading-tight">
            <Link href={`/menuisiers/${m.slug}`} className="after:absolute after:inset-0 hover:text-primary focus-visible:outline-offset-4">
              {m.name}
            </Link>
          </h3>
          {m.city && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
              <MapPin size={14} aria-hidden />
              {m.city}
            </p>
          )}
        </div>
        <p className="flex items-center gap-2 text-sm">
          {m.reviews > 0 ? (
            <>
              <Stars value={m.rating} label={`${m.rating} ${t("mp.outOf5")}`} />
              <span className="font-semibold">{m.rating.toFixed(1)}</span>
              <span className="text-muted">
                ({m.reviews} {t("dir.reviews")})
              </span>
            </>
          ) : (
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted">{t("dir.noReviews")}</span>
          )}
        </p>
        {m.bio && <p className="line-clamp-2 text-sm text-muted">{m.bio}</p>}
        <ul className="flex flex-wrap gap-1.5">
          {m.specialties.slice(0, 4).map((s) => (
            <li key={s} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {t(`spec.${s as "fenetres"}`)}
            </li>
          ))}
        </ul>
        <dl className="mt-auto flex gap-4 border-t border-line pt-3 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <Hammer size={14} aria-hidden />
            <dd>
              <strong className="text-ink">{m.completed}</strong> {t("dir.completed")}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Images size={14} aria-hidden />
            <dd>
              <strong className="text-ink">{m.portfolio}</strong> {t("dir.portfolio")}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
