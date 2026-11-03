"use client";
import Brand from "./Brand";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, ArrowUpRight, Images, LayoutGrid, Menu, Moon, Smartphone, Sun, Users, X } from "lucide-react";
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

// Liens de la vitrine, partagés par la barre du haut, le menu burger et le pied de page. Le dernier mène au téléchargement de l'application Android.
const navLinks = (c: (typeof marketing)[Locale]) => [["/application", c.app, LayoutGrid], ["/menuisiers", c.joiners, Users], ["/realisations-menuiserie", c.gallery, Images], ["/telecharger", c.getApp, Smartphone]] as const;

function PublicNavigation() {
  const { locale, t } = useI18n(); const c = marketing[locale]; const path = usePathname();
  return <nav aria-label={t("nav.main")} className="flex items-center gap-0.5 text-sm">{navLinks(c).map(([href,label,Icon])=><Link key={href} href={href} aria-current={path === href || path.startsWith(href+"/") ? "page" : undefined} className="nav-link relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-muted transition-colors hover:text-ink aria-[current=page]:font-semibold aria-[current=page]:text-ink">{href === "/telecharger" && <Icon size={14} aria-hidden className="text-accent" />}{label}</Link>)}</nav>;
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

// Menu burger : sous 1280 px la barre de liens ne tient plus. Panneau vitré sous l'en-tête, fermé par Échap, un clic à côté, un clic sur un lien ou un retour au grand écran.
// Langue, thème et connexion y sont repris sur petit écran, où l'en-tête n'a plus la place de les afficher.
function PanelLinks({ onNavigate }: { onNavigate: () => void }) {
  const { locale, t } = useI18n(); const c = marketing[locale]; const path = usePathname();
  return <nav aria-label={t("nav.main")}><ul className="space-y-1">{navLinks(c).map(([href,label,Icon])=>{
    const here = path === href || path.startsWith(href+"/"); const app = href === "/telecharger";
    return <li key={href}><Link href={href} onClick={onNavigate} aria-current={here ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 text-[15px] font-medium transition-colors ${app ? "bg-accent/15 text-ink hover:bg-accent/25" : here ? "bg-black/5 text-ink dark:bg-white/10" : "text-muted hover:bg-black/5 hover:text-ink dark:hover:bg-white/10"}`}><Icon size={18} aria-hidden className={app || here ? "text-accent" : ""} /><span className="flex-1">{label}</span>{app && <ArrowUpRight size={16} aria-hidden className="text-accent" />}</Link></li>;
  })}</ul></nav>;
}

function MobileMenu({ myHref }: { myHref: string | null }) {
  const { t, locale } = useI18n(); const c = marketing[locale];
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null); const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    const wide = window.matchMedia("(min-width: 1280px)"); const grow = () => wide.matches && setOpen(false);
    document.addEventListener("pointerdown", away); document.addEventListener("keydown", key); wide.addEventListener("change", grow);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", key); wide.removeEventListener("change", grow); };
  }, [open]);
  const close = () => setOpen(false);
  return <div ref={root} className="xl:hidden">
    <button ref={btn} type="button" aria-label={t("pub.menu")} aria-expanded={open} aria-controls="public-menu" onClick={() => setOpen((o) => !o)} className="grid size-10 place-items-center rounded-full text-ink transition-colors hover:bg-black/10 dark:hover:bg-white/10">{open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}</button>
    {open && <div id="public-menu" className="select-pop absolute inset-x-0 top-full z-40 mt-2 max-h-[calc(100dvh-7.5rem)] origin-top overflow-y-auto rounded-[1.75rem] border border-line bg-surface p-3 shadow-[0_18px_48px_rgba(0,0,0,0.35)]">
      <Suspense fallback={null}><PanelLinks onNavigate={close} /></Suspense>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line/60 px-2 pt-3 sm:hidden"><span className="text-xs font-semibold uppercase tracking-wide text-muted">{t("lang.label")}</span><GlassControls /></div>
      <div className="mt-3 grid gap-2 border-t border-line/60 pt-3 md:hidden">
        {myHref ? <Link href={myHref} onClick={close} className="btn-accent !rounded-full">{t("pub.myspace")}<ArrowUpRight size={15} aria-hidden /></Link> : <>
          <Link href="/inscription" onClick={close} className="btn-accent !rounded-full">{c.start}<ArrowUpRight size={15} aria-hidden /></Link>
          <Link href="/connexion" onClick={close} className="btn-secondary !rounded-full">{t("pub.login")}</Link></>}
      </div>
    </div>}
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
          <div className="flex items-center gap-1 sm:gap-2"><div className="hidden sm:block"><GlassControls /></div>{me ? <><Link href={homeFor(me.role)} className="hidden items-center rounded-full border border-line/70 px-4 py-2 text-sm font-semibold transition-colors hover:bg-black/10 sm:inline-flex dark:hover:bg-white/10">{t("pub.myspace")}</Link><UserMenu /></> : <><Link href="/connexion" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink sm:inline-flex">{t("pub.login")}</Link><Link href="/inscription" className="btn-accent hidden !rounded-full !px-5 md:inline-flex">{c.start}<ArrowUpRight size={15} aria-hidden /></Link></>}<MobileMenu myHref={me ? homeFor(me.role) : null} /></div>
        </div>
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
          <nav aria-label={c.explore} className="px-3 md:px-0"><h2 className="eyebrow">{c.explore}</h2><ul className="mt-5 space-y-3 text-sm">{navLinks(c).map(([href,label])=><li key={href}><Link href={href} className="text-muted hover:text-primary hover:underline">{label}</Link></li>)}</ul></nav>
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
