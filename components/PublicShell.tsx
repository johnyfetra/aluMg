"use client";
import Brand from "./Brand";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ArrowUp, ArrowUpRight, Moon, Sun } from "lucide-react";
import { UserMenu } from "./Controls";
import { setTheme, useTheme } from "@/lib/theme";
import { homeFor, useSession } from "@/lib/client";
import { LOCALES, type Locale, useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";

// Le logo mène à l'accueil ; déjà sur l'accueil, il remonte en haut de page (un lien vers la page courante ne fait rien de lui-même).
// L'adresse est lue au clic plutôt qu'avec usePathname : le pied de page se prérend sans Suspense.
function HomeLink({ className, ...rest }: Omit<React.ComponentProps<typeof Link>, "href">) {
  return <Link href="/" className={className} onClick={(e) => { if (location.pathname === "/") { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); } }} {...rest} />;
}

function PublicNavigation() {
  const { locale, t } = useI18n(); const c = marketing[locale]; const path = usePathname();
  return <nav aria-label={t("nav.main")} className="flex items-center gap-0.5 text-sm">{[["/application",c.app],["/menuisiers",c.joiners],["/realisations-menuiserie",c.gallery]].map(([href,label])=><Link key={href} href={href} aria-current={path === href || path.startsWith(href+"/") ? "page" : undefined} className="nav-link relative whitespace-nowrap rounded-full px-4 py-2 text-muted transition-colors hover:text-ink aria-[current=page]:font-semibold aria-[current=page]:text-ink">{label}</Link>)}</nav>;
}

// Langue : trois codes côte à côte (un seul geste, pas de menu) ; thème : un bouton qui bascule.
function GlassControls() {
  const { t, locale, setLocale } = useI18n(); const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return <div className="flex items-center gap-1">
    <div role="group" aria-label={t("lang.label")} className="flex items-center rounded-full bg-black/10 p-0.5 font-mono text-[11px] font-semibold dark:bg-white/10">{(Object.keys(LOCALES) as Locale[]).map(k=><button key={k} type="button" lang={k} aria-pressed={k===locale} title={LOCALES[k]} onClick={()=>setLocale(k)} className={`grid h-8 min-w-9 place-items-center rounded-full px-2 uppercase transition-colors ${k===locale ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>{k}</button>)}</div>
    <button type="button" aria-label={t(next === "dark" ? "theme.dark" : "theme.light")} data-tooltip={t(next === "dark" ? "theme.dark" : "theme.light")} onClick={()=>setTheme(next)} className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-black/10 hover:text-ink dark:hover:bg-white/10">{theme === "dark" ? <Sun size={17} aria-hidden /> : <Moon size={17} aria-hidden />}</button>
  </div>;
}

export default function PublicShell({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n(); const c = marketing[locale]; const { data: me } = useSession();
  return <div className="flex min-h-screen flex-col">
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:p-3">{t("nav.skip")}</a>
    <header className="sticky top-3 z-30 px-3 pt-3 sm:px-6">
      <div className="glass-nav relative mx-auto max-w-[84rem] rounded-[1.75rem] xl:rounded-full">
        <div className="flex min-h-16 items-center justify-between gap-x-3 px-3 py-2 sm:pl-5 sm:pr-3">
          <HomeLink aria-label={`AluMg, ${c.home}`} className="shrink-0"><Brand /></HomeLink>
          <div className="hidden xl:block"><Suspense fallback={null}><PublicNavigation /></Suspense></div>
          <div className="flex items-center gap-1 sm:gap-2"><GlassControls />{me ? <><Link href={homeFor(me.role)} className="hidden items-center rounded-full border border-line/70 px-4 py-2 text-sm font-semibold transition-colors hover:bg-black/10 sm:inline-flex dark:hover:bg-white/10">{t("pub.myspace")}</Link><UserMenu /></> : <><Link href="/connexion" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink sm:inline-flex">{t("pub.login")}</Link><Link href="/inscription" className="btn-accent hidden !rounded-full !px-5 md:inline-flex">{c.start}<ArrowUpRight size={15} aria-hidden /></Link></>}</div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1 border-t border-line/40 px-2 py-1 xl:hidden"><Suspense fallback={null}><PublicNavigation /></Suspense>{!me && <Link href="/connexion" className="rounded-full px-4 py-2 text-sm font-semibold text-muted sm:hidden">{t("pub.login")}</Link>}</div>
        <span aria-hidden className="nav-meter pointer-events-none absolute inset-x-8 bottom-0 h-0.5 origin-left rounded-full bg-accent" />
      </div>
    </header>
    <main id="main" className="vitrine min-w-0 flex-1">{children}</main>
    <footer className="border-t border-line bg-bg">
      <div className="public-container grid gap-8 py-10 md:grid-cols-[2fr_1fr_1fr] md:gap-10 md:py-14">
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <HomeLink><Brand /></HomeLink>
          <p className="mt-4 max-w-xs text-sm leading-7 text-muted">{c.footer}</p>
        </div>
        {/* mobile : deux colonnes centrées séparées par un filet vertical ; bureau : colonnes à plat dans la grille */}
        <div className="grid grid-cols-2 divide-x divide-line border-y border-line py-8 text-center md:contents md:divide-x-0 md:border-0 md:py-0 md:text-left">
          <nav aria-label={c.explore} className="px-3 md:px-0"><h2 className="eyebrow">{c.explore}</h2><ul className="mt-5 space-y-3 text-sm">{[["/application",c.app],["/menuisiers",c.joiners],["/realisations-menuiserie",c.gallery]].map(([href,label])=><li key={href}><Link href={href} className="text-muted hover:text-primary hover:underline">{label}</Link></li>)}</ul></nav>
          <nav aria-label={c.account} className="px-3 md:px-0"><h2 className="eyebrow">{c.account}</h2><ul className="mt-5 space-y-3 text-sm">{[["/connexion",t("pub.login")],["/inscription?role=client",c.client],["/inscription?role=menuisier",c.pro]].map(([href,label])=><li key={href}><Link href={href} className="text-muted hover:text-primary hover:underline">{label}</Link></li>)}</ul></nav>
        </div>
        <div className="flex flex-col items-center gap-3 text-xs text-muted md:col-span-3 md:flex-row md:justify-between md:border-t md:border-line md:pt-6">
          <p>© AluMg</p>
          <a href="#main" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors hover:text-ink"><ArrowUp size={14} aria-hidden />{t("pub.top")}</a>
        </div>
      </div>
    </footer>
  </div>;
}
