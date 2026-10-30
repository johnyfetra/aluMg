"use client";
import Brand from "./Brand";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { LangMenu, ThemeSwitch, UserMenu } from "./Controls";
import { homeFor, useSession } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";

function PublicNavigation() {
  const { locale, t } = useI18n(); const c = marketing[locale]; const path = usePathname();
  return <nav aria-label={t("nav.main")} className="flex items-center gap-1 text-sm sm:gap-2">{[["/application",c.app],["/menuisiers",c.joiners],["/realisations-menuiserie",c.gallery]].map(([href,label])=><Link key={href} href={href} aria-current={path === href || path.startsWith(href+"/") ? "page" : undefined} className="whitespace-nowrap rounded-lg px-3 py-2.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink aria-[current=page]:bg-surface-2 aria-[current=page]:text-primary">{label}</Link>)}</nav>;
}

export default function PublicShell({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n(); const c = marketing[locale]; const { data: me } = useSession();
  return <div className="flex min-h-screen flex-col">
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:p-3">{t("nav.skip")}</a>
    <header className="sticky top-0 z-30 border-b border-line bg-bg">
      <div className="public-container flex min-h-20 flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3">
        <Link href="/" aria-label={`AluMg — ${c.home}`} className="shrink-0"><Brand /></Link>
        <div className="hidden xl:block"><Suspense fallback={null}><PublicNavigation /></Suspense></div>
        <div className="flex items-center gap-1 sm:gap-2"><LangMenu /><ThemeSwitch />{me ? <><Link href={homeFor(me.role)} className="btn-secondary hidden sm:inline-flex">{t("pub.myspace")}</Link><UserMenu /></> : <><Link href="/connexion" className="btn-ghost hidden sm:inline-flex">{t("pub.login")}</Link><Link href="/inscription" className="btn-primary hidden md:inline-flex">{c.start}<ArrowUpRight size={15} aria-hidden /></Link></>}</div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1 border-t border-line px-2 py-1 xl:hidden"><Suspense fallback={null}><PublicNavigation /></Suspense>{!me && <Link href="/connexion" className="btn-ghost sm:hidden">{t("pub.login")}</Link>}</div>
    </header>
    <main id="main" className="min-w-0 flex-1">{children}</main>
    <footer className="border-t border-line bg-bg"><div className="public-container grid gap-10 py-14 md:grid-cols-[2fr_1fr_1fr]"><div><Link href="/"><Brand /></Link><p className="mt-4 max-w-xs text-sm leading-7 text-muted">{c.footer}</p><p className="mt-5 text-xs text-muted">© AluMg</p></div><div><h2 className="eyebrow">{c.explore}</h2><ul className="mt-5 space-y-3 text-sm">{[["/application",c.app],["/menuisiers",c.joiners],["/realisations-menuiserie",c.gallery]].map(([href,label])=><li key={href}><Link href={href} className="text-muted hover:text-primary hover:underline">{label}</Link></li>)}</ul></div><div><h2 className="eyebrow">{c.account}</h2><ul className="mt-5 space-y-3 text-sm">{[["/connexion",t("pub.login")],["/inscription?role=client",c.client],["/inscription?role=menuisier",c.pro]].map(([href,label])=><li key={href}><Link href={href} className="text-muted hover:text-primary hover:underline">{label}</Link></li>)}</ul></div></div></footer>
  </div>;
}
