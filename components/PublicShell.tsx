"use client";
import Brand from "./Brand";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { Suspense, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowUp, ArrowUpRight, ChevronRight, Images, LayoutGrid, MessageCircle, Moon, Smartphone, Sun, Users } from "lucide-react";
import { UserMenu } from "./Controls";
import { setTheme, useTheme } from "@/lib/theme";
import { homeFor, usePublicSocial, useSession } from "@/lib/client";
import SocialIcon from "./SocialIcon";
import { LOCALES, type Locale, useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";
import { SUPPORT_PHONE_DISPLAY, supportUrl } from "@/lib/support";

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

// Menu burger : sous 1280 px la barre de liens ne tient plus. Le panneau descend comme un volet roulant et reprend le langage du métier :
// cadre de profilé aluminium, cotes de plan, numéros de référence, poignée en laiton, lame finale de volet. Fermé par Échap, un clic à côté, un clic sur un lien ou un retour au grand écran.
// Langue, thème et connexion y sont repris sur petit écran, où l'en-tête n'a plus la place de les afficher.
function PanelLinks({ onNavigate }: { onNavigate: () => void }) {
  const { locale, t } = useI18n(); const c = marketing[locale]; const path = usePathname();
  const links = navLinks(c); const app = links[links.length - 1]; const pages = links.slice(0, -1); const AppIcon = app[2];
  const here = (href: string) => path === href || path.startsWith(href + "/");
  return <nav aria-label={t("nav.main")}>
    {/* cote de plan : un trait avec deux repères, comme sur un dessin d'exécution */}
    <p className="menu-item mb-1 flex items-center gap-2 px-3 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted" style={{ "--i": 0 } as CSSProperties}>
      <span aria-hidden className="h-3 w-px bg-line" /><span aria-hidden className="h-px w-2 bg-line" />{c.explore}<span aria-hidden className="h-px flex-1 bg-line" /><span aria-hidden className="h-3 w-px bg-line" />
    </p>
    <ul>{pages.map(([href, label, Icon], n) => <li key={href} className="menu-item" style={{ "--i": n + 1 } as CSSProperties}>
      <Link href={href} onClick={onNavigate} aria-current={here(href) ? "page" : undefined} className="group relative flex min-h-14 items-center gap-3 rounded-2xl pl-6 pr-4 text-[15px] font-medium text-muted transition-colors hover:bg-black/5 hover:text-ink aria-[current=page]:bg-accent/10 aria-[current=page]:font-semibold aria-[current=page]:text-ink dark:hover:bg-white/10">
        {/* poignée de fenêtre : apparaît au survol, reste sur la page courante */}
        <span aria-hidden className="absolute left-2 top-1/2 h-6 w-1 -translate-x-1 -translate-y-1/2 rounded-full bg-accent opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-70 group-aria-[current=page]:translate-x-0 group-aria-[current=page]:opacity-100" />
        <span aria-hidden className="w-5 font-mono text-[11px] tabular-nums text-muted/80">{String(n + 1).padStart(2, "0")}</span>
        <Icon size={18} aria-hidden className="shrink-0" /><span className="flex-1">{label}</span>
        <ChevronRight size={16} aria-hidden className="shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
      </Link></li>)}</ul>
    <Link href={app[0]} onClick={onNavigate} aria-current={here(app[0]) ? "page" : undefined} className="menu-item group mt-2 flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-3 transition-colors hover:bg-accent/20" style={{ "--i": pages.length + 1 } as CSSProperties}>
      <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-accent/50 bg-surface text-accent"><AppIcon size={20} aria-hidden /></span>
      <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold text-ink">{app[1]}</span><span className="block truncate text-xs text-muted">{c.getAppSub}</span></span>
      <ArrowUpRight size={18} aria-hidden className="shrink-0 text-accent transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  </nav>;
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
  // trois lames de volet roulant : la lame du milieu rentre, les deux autres se croisent
  const lame = "absolute left-0 h-0.5 rounded-full bg-current transition-all duration-300";
  return <div ref={root} className="xl:hidden">
    <button ref={btn} type="button" aria-label={t("pub.menu")} aria-expanded={open} aria-controls="public-menu" onClick={() => setOpen((o) => !o)} className="grid size-10 place-items-center rounded-full text-ink transition-colors hover:bg-black/10 dark:hover:bg-white/10">
      <span aria-hidden className="relative block h-3.5 w-5"><span className={`${lame} top-0 w-5 ${open ? "translate-y-[6px] rotate-45" : ""}`} /><span className={`${lame} top-[6px] ${open ? "w-0 opacity-0" : "w-3.5"}`} /><span className={`${lame} top-3 w-5 ${open ? "-translate-y-[6px] -rotate-45" : ""}`} /></span>
    </button>
    {open && <>
      {/* voile derrière l'en-tête : hors de l'en-tête, dont le flou limiterait un élément fixed à sa propre taille */}
      {createPortal(<div aria-hidden onClick={close} className="fixed inset-0 z-[25] bg-black/35 backdrop-blur-[2px]" />, document.body)}
      <div id="public-menu" className="menu-shutter absolute inset-x-0 top-full z-40 mt-2 max-h-[calc(100dvh-7.5rem)] overflow-y-auto rounded-[1.75rem] border border-line bg-gradient-to-b from-surface to-surface-2 p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
        {/* cadre de profilé : un second filet intérieur, comme la chambre d'un dormant aluminium */}
        <div className="rounded-[1.4rem] border border-line/60 p-2">
          <Suspense fallback={null}><PanelLinks onNavigate={close} /></Suspense>
          <div className="menu-item mt-3 flex items-center justify-between gap-3 border-t border-line/60 px-2 pt-3 sm:hidden" style={{ "--i": 5 } as CSSProperties}><span className="text-xs font-semibold uppercase tracking-wide text-muted">{t("lang.label")}</span><GlassControls /></div>
          <div className="menu-item mt-3 grid gap-2 border-t border-line/60 pt-3 md:hidden" style={{ "--i": 6 } as CSSProperties}>
            {myHref ? <Link href={myHref} onClick={close} className="btn-accent !rounded-full">{t("pub.myspace")}<ArrowUpRight size={15} aria-hidden /></Link> : <>
              <Link href="/inscription" onClick={close} className="btn-accent !rounded-full">{c.start}<ArrowUpRight size={15} aria-hidden /></Link>
              <Link href="/connexion" onClick={close} className="btn-secondary !rounded-full">{t("pub.login")}</Link></>}
          </div>
          <a href={supportUrl(t("support.msg"))} target="_blank" rel="noopener noreferrer" onClick={close} className="menu-item mt-3 flex items-center gap-3 rounded-2xl px-3 py-2 text-muted transition-colors hover:text-ink" style={{ "--i": 7 } as CSSProperties}>
            <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line/70"><MessageCircle size={16} aria-hidden /></span>
            <span className="text-sm font-medium"><span className="block">{t("support.contact")}</span><span className="block text-xs font-normal text-muted/80">{t("support.via")} · {SUPPORT_PHONE_DISPLAY}</span></span>
          </a>
        </div>
        {/* lame finale du volet, avec sa poignée */}
        <div aria-hidden className="mx-auto mt-1.5 grid h-3 w-[calc(100%-1.5rem)] place-items-center rounded-b-xl rounded-t-sm bg-[repeating-linear-gradient(to_bottom,color-mix(in_srgb,var(--text)_14%,transparent)_0_1px,transparent_1px_4px)]"><span className="h-1 w-10 rounded-full bg-accent/70" /></div>
      </div>
    </>}
  </div>;
}

export default function PublicShell({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n(); const c = marketing[locale]; const { data: me } = useSession(); const { data: social } = usePublicSocial();
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
          {!!social?.length && (
            <ul aria-label={t("pub.follow")} className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
              {social.map((s) => (
                <li key={s.id}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`${s.label} (${t(`social.${s.network}`)})`} data-tooltip={s.label} className="social-btn grid size-11 place-items-center rounded-full border border-[color-mix(in_srgb,var(--text)_30%,var(--border))] text-ink">
                    <SocialIcon network={s.network} size={20} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* mobile : deux colonnes centrées séparées par un filet vertical ; bureau : colonnes à plat dans la grille */}
        <div className="grid grid-cols-2 divide-x divide-line border-y border-line py-8 text-center md:contents md:divide-x-0 md:border-0 md:py-0 md:text-left">
          <nav aria-label={c.explore} className="px-3 md:px-0"><h2 className="eyebrow">{c.explore}</h2><ul className="mt-5 space-y-3 text-sm">{navLinks(c).map(([href,label])=><li key={href}><Link href={href} className="text-muted hover:text-primary hover:underline">{label}</Link></li>)}</ul></nav>
          <nav aria-label={c.account} className="px-3 md:px-0"><h2 className="eyebrow">{c.account}</h2><ul className="mt-5 space-y-3 text-sm">{[["/connexion",t("pub.login")],["/inscription?role=client",c.client],["/inscription?role=menuisier",c.pro]].map(([href,label])=><li key={href}><Link href={href} className="text-muted hover:text-primary hover:underline">{label}</Link></li>)}<li><a href={supportUrl(t("support.msg"))} target="_blank" rel="noopener noreferrer" title={`WhatsApp ${SUPPORT_PHONE_DISPLAY}`} className="inline-flex items-center gap-1.5 text-muted hover:text-primary hover:underline"><MessageCircle size={14} aria-hidden />{t("support.contact")}</a></li></ul></nav>
        </div>
        <div className="flex flex-col items-center gap-3 text-xs text-muted md:col-span-3 md:flex-row md:justify-between md:border-t md:border-line md:pt-6">
          <p>© AluMg</p>
          <a href="#main" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors hover:text-ink"><ArrowUp size={14} aria-hidden />{t("pub.top")}</a>
        </div>
      </div>
    </footer>
  </div>;
}
