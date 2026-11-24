"use client";
import { AlignLeft, BadgePercent, FilePlus2, MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import AppUpdate from "./AppUpdate";
import Brand from "./Brand";
import ChatWidget from "./ChatWidget";
import { SubscriptionBanner } from "./Subscription";
import { UserMenu } from "./Controls";
import CountBadge from "./CountBadge";
import FeedbackButton from "./FeedbackDialog";
import GuideTour from "./GuideTour";
import IconButton from "./IconButton";
import NotificationBell from "./NotificationBell";
import TopSearch, { SearchProvider, useSearchActive } from "./PageSearch";
import TariffsPanel, { openTariffs } from "./TariffsPanel";
import OfflineSupport from "./offline/OfflineSupport";
import DrawerUser from "./shell/DrawerUser";
import NavLinks from "./shell/NavLinks";
import SideNavToggle, { useMiniNav } from "./shell/SideNavToggle";
import { currentItem, navFor, type Nav } from "./shell/nav";
import { useNotifications, useSession, useUnread } from "@/lib/client";
import { useI18n } from "@/lib/i18n";

// Cadre de l'application : barre latérale (navigation par rôle, voir shell/nav.ts), barre du haut (titre, recherche de la page, actions), contenu.
// Le contenu défile dans son propre cadre (≥ lg) : le routeur ne le remonte pas, on le fait à chaque changement de page.
function ScrollTop() {
  const path = usePathname();
  useEffect(() => { document.getElementById("scroller")?.scrollTo(0, 0); }, [path]);
  return null;
}

function PageTitle({ nav }: { nav: Nav }) {
  const { t } = useI18n();
  const searching = useSearchActive(); // sur écran moyen, la recherche prend la place du titre
  const path = usePathname();
  const cur = currentItem(nav, path);
  return cur ? <p className={`min-w-0 shrink-0 truncate text-[15px] font-semibold tracking-tight max-lg:shrink lg:max-w-[14rem] lg:pl-2 lg:text-lg ${searching ? "lg:hidden xl:block" : ""}`}>{t(cur.key)}</p> : null;
}

export default function Shell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { data: me } = useSession();
  const unread = useUnread(); // messages non lus : pastille sur l'icône messages de la barre du haut (mobile)
  const { data: notif } = useNotifications();
  const badge = unread + (notif?.unread ?? 0);
  // application Android : même total sur l'icône (voir mobile/…/MainActivity.java)
  useEffect(() => {
    (window as { AluMgNative?: { setBadge(n: number): void } }).AluMgNative?.setBadge(badge);
  }, [badge]);
  const nav = navFor(me?.role);
  const [open, setOpen] = useState(false);
  const [mini] = useMiniNav();

  const sidebar = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      if (sidebar.current) sidebar.current.inert = !media.matches && !open;
      if (media.matches && open) setOpen(false);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
      if (event.key === "Tab") {
        const items = sidebar.current?.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)");
        if (!items?.length) return;
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div className="app-frame min-h-screen bg-bg lg:fixed lg:inset-0 lg:grid lg:grid-cols-[17.5rem_1fr] lg:overflow-clip lg:transition-[grid-template-columns] lg:duration-300 lg:mini:grid-cols-[5.75rem_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:p-3">
        {t("nav.skip")}
      </a>

      {open && <div className="fixed inset-0 z-30 bg-black/55 backdrop-blur-[2px] lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      {/* sur grand écran, la barre et sa languette de pliage partagent ce cadre */}
      <div className="group/side lg:relative lg:min-w-0">
      <aside ref={sidebar} id="app-navigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(20rem,86vw)] flex-col overflow-clip rounded-r-[2rem] bg-linear-to-b from-(--side-bg) to-(--side-bg-2) pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 shadow-2xl transition-transform duration-200 lg:relative lg:my-3 lg:ml-3 lg:h-[calc(100dvh-1.5rem)] lg:w-auto lg:translate-x-0 lg:rounded-[2rem] lg:pb-5 lg:pt-5 lg:shadow-[0_18px_40px_-18px_rgb(14_76_140/0.6)] ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* halos décoratifs, derrière le contenu */}
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-white/[.06]" />
        <span aria-hidden className="pointer-events-none absolute -bottom-20 -left-20 size-64 rounded-full bg-white/[.05]" />
        <div className="relative mb-6 flex shrink-0 items-start justify-between px-5 lg:mini:justify-center lg:mini:px-0">
          <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3">
            <Brand light compact />
            <span className="lg:mini:sr-only">
              <span className="block text-xl font-bold leading-tight tracking-tight text-white">AluMg</span>
              <span className="block text-xs leading-tight text-(--side-muted)">{t(me?.role === "client" ? "ui.client" : me?.role === "admin" ? "nav.group.admin" : "ui.professional")}</span>
            </span>
          </Link>
          <button type="button" className="grid size-10 place-items-center rounded-full bg-(--side-hover) text-(--side-fg) transition-colors hover:bg-(--side-active) lg:hidden" onClick={() => { setOpen(false); toggle.current?.focus(); }} aria-label={t("menu.close")}>
            <X size={20} aria-hidden />
          </button>
        </div>
        {/* le logo reste en place ; seule la liste défile, et seulement si l'écran est trop bas */}
        <div className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        <Suspense fallback={null}>
          {me && <NavLinks nav={nav} mini={mini} onNavigate={() => setOpen(false)} />}
        </Suspense>
        {me?.role === "menuisier" && (
          <button type="button" onClick={() => { setOpen(false); openTariffs(); }} className="mx-4 mt-4 flex min-h-11 items-center gap-3 rounded-xl border border-(--side-active) px-3 text-sm font-medium text-(--side-fg) transition-colors hover:bg-(--side-hover) lg:hidden">
            <BadgePercent size={18} aria-hidden className="text-(--side-accent)" />
            {t("tariffs.title")}
          </button>
        )}
        {me && <DrawerUser name={me.name} email={me.email || me.phone} avatar={me.avatar} />}
        </div>
      </aside>
      <SideNavToggle controls="app-navigation" />
      </div>

      <SearchProvider>
      <div id="scroller" className="min-w-0 lg:h-dvh lg:overflow-y-auto lg:overscroll-contain">
        {/* la barre flotte : un fondu du fond masque le contenu qui défile au-dessus d'elle */}
        <div className="sticky top-0 z-20 bg-linear-to-b from-bg from-60% to-transparent px-3 pt-3 sm:px-6 xl:px-8">
        <header id="topbar" className="flex h-16 items-center gap-2 rounded-[1.25rem] border border-line/60 bg-surface/80 px-2 shadow-(--shadow-card) backdrop-blur-xl backdrop-saturate-150 sm:gap-3 sm:px-4">
          <button ref={toggle} data-tour="menu" aria-controls="app-navigation" type="button" className="relative -ml-1 grid size-11 shrink-0 place-items-center rounded-xl text-ink transition-colors hover:bg-surface-2 active:bg-surface-2 lg:hidden" onClick={() => setOpen(true)} aria-label={`${t("menu.open")}${unread ? ` (${unread} ${t("msg.unread")})` : ""}`} aria-expanded={open}>
            <AlignLeft size={24} strokeWidth={2} aria-hidden />
          </button>
          <Suspense fallback={null}>
            <ScrollTop />
            <PageTitle nav={nav} />
          </Suspense>
          <div className="flex min-w-0 flex-1 justify-center px-2"><TopSearch /></div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {me && (
              <IconButton href="/messages" tip={false} className="lg:hidden" label={unread > 0 ? `${t("nav.messages")}, ${unread} ${t("msg.unread")}` : t("nav.messages")}>
                <MessageCircle size={18} aria-hidden />
                <CountBadge n={unread} className="absolute -right-1 -top-1" />
              </IconButton>
            )}
            {me?.role === "menuisier" && <GuideTour userId={me.id} />}
            {me && <FeedbackButton role={me.role} />}
            {me?.role === "client" && (
              <Link href="/espace-client/nouvelle" className="btn-primary !min-h-10 !rounded-full !px-0 max-sm:w-10 sm:!px-4" aria-label={t("cl.newRequest")} data-tooltip={t("cl.newRequest")}>
                <FilePlus2 size={18} aria-hidden />
                <span className="max-sm:sr-only">{t("cl.newRequest")}</span>
              </Link>
            )}
            {me?.role === "menuisier" && (
              <button type="button" data-tour="tariffs" onClick={openTariffs} className="hidden h-10 items-center gap-2 rounded-full bg-surface-2 px-3 text-sm xl:px-4 font-medium transition-colors hover:bg-primary/10 hover:text-primary lg:flex" data-tooltip={t("tariffs.sub")}>
                <BadgePercent size={16} aria-hidden className="text-primary" />
                <span className="max-xl:sr-only">{t("tariffs.title")}</span>
              </button>
            )}
            <NotificationBell />
            <UserMenu prefs />
          </div>
        </header>
        </div>
        <main id="main" className="mx-auto w-full max-w-[110rem] px-4 pb-20 pt-6 sm:px-8 xl:px-10">
          {me?.mustChangePassword && (
            <p role="status" className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-medium">
              {t("account.mustChangeBanner")}
              <Link href="/compte" className="text-primary underline">{t("account.mustChangeGo")}</Link>
            </p>
          )}
          {me?.role === "menuisier" && <SubscriptionBanner />}
          {me?.role === "menuisier" && <OfflineSupport />}
          {children}
        </main>
        {me?.role === "menuisier" && <TariffsPanel />}
        <Suspense fallback={null}>
          <ChatWidget />
        </Suspense>
        <AppUpdate />
      </div>
      </SearchProvider>
    </div>
  );
}
