"use client";
import { FilePlus2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CountBadge from "../CountBadge";
import { useUnread } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import type { Nav } from "./nav";

// usePathname() est lu à l'exécution : isolé dans Suspense pour garder le reste du layout prérendu.
export default function NavLinks({ nav, onNavigate, mini }: { nav: Nav; onNavigate: () => void; mini: boolean }) {
  const { t } = useI18n();
  const path = usePathname();
  const creating = !!nav.cta?.match(path);
  const unread = useUnread();
  return (
    <nav aria-label={t("nav.main")} className="relative flex flex-col gap-5 px-3">
      {nav.cta && (
        <Link
          href={nav.cta.href}
          onClick={onNavigate}
          aria-current={creating ? "page" : undefined}
          title={mini ? t(nav.cta.key) : undefined}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-on-accent shadow-[0_8px_20px_-8px_rgb(255_159_67/0.7)] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0"
        >
          <FilePlus2 size={18} aria-hidden className="shrink-0" />
          <span className="lg:mini:sr-only">{t(nav.cta.key)}</span>
        </Link>
      )}
      {nav.groups.map((g) => (
        <div key={g.label}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[.14em] text-(--side-muted) lg:mini:sr-only">{t(g.label)}</p>
          <span aria-hidden className="mx-2 mb-2 hidden h-px bg-white/15 lg:mini:block" />
          <ul className="space-y-0.5">
            {g.items.map(({ href, key, Icon, match }) => {
              const active = match(path);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={mini ? t(key) : undefined}
                    className={`side-link relative flex min-h-11 items-center gap-3 rounded-2xl px-2 text-sm lg:mini:justify-center lg:mini:px-0 ${active ? "bg-white font-semibold text-[#155fa8] shadow-[0_10px_24px_-12px_rgb(0_0_0/0.45)]" : "font-medium text-(--side-fg) hover:bg-(--side-hover)"}`}
                  >
                    <span aria-hidden className={`side-ico grid size-8 shrink-0 place-items-center rounded-xl ${active ? "bg-(--side-bg) text-white" : "bg-white/10"}`}><Icon size={17} /></span>
                    <span className="side-txt min-w-0 break-words lg:mini:sr-only">{t(key)}</span>
                    {href === "/messages" && <CountBadge n={unread} label={`${unread} ${t("msg.unread")}`} className="ml-auto !ring-0 lg:mini:absolute lg:mini:right-0.5 lg:mini:top-0.5" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
