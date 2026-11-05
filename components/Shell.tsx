"use client";
import Brand from "./Brand";
import TariffsPanel, { openTariffs } from "./TariffsPanel";
import AppUpdate from "./AppUpdate";
import ChatWidget from "./ChatWidget";
import FeedbackButton from "./FeedbackDialog";
import GuideTour from "./GuideTour";
import CountBadge from "./CountBadge";
import NotificationBell from "./NotificationBell";
import { AlignLeft, BadgePercent, BookOpen, FilePlus2, MessageCircle, FileText, LayoutDashboard, LogOut, Settings, UserCircle, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { LangMenu, ThemeSwitch, UserMenu } from "./Controls";
import { Avatar } from "./ui";
import { useI18n } from "@/lib/i18n";
import type { Messages } from "@/lib/messages/fr";

import { Boxes, Briefcase, Share2, ClipboardList, Gauge, Images, LayoutTemplate, MessageSquareText, ScrollText, Search, Store, Users } from "lucide-react";
import { request, useNotifications, useSession, useUnread } from "@/lib/client";
import { HIDDEN, HIDDEN_CLIENT, MVP } from "@/lib/mvp";

type Item = { href: string; key: keyof Messages; Icon: typeof Settings; match: (p: string) => boolean };
type Group = { label: keyof Messages; items: Item[] };
type Nav = { home: string; cta?: Item; groups: Group[] }; // navigation adaptée au rôle

const starts = (...prefix: string[]) => (p: string) => prefix.some((x) => p === x || p.startsWith(`${x}/`));

const FULL_MENUISIER: Nav = {
  home: "/tableau-de-bord",
  cta: { href: "/devis/nouveau", key: "nav.new", Icon: FilePlus2, match: (p) => p === "/devis/nouveau" },
  groups: [
    {
      label: "nav.group.main",
      items: [
        { href: "/tableau-de-bord", key: "nav.dashboard", Icon: LayoutDashboard, match: starts("/tableau-de-bord") },
        { href: "/devis", key: "nav.quotes", Icon: FileText, match: (p) => (p === "/devis" || p.startsWith("/devis/")) && p !== "/devis/nouveau" },
        { href: "/chantiers", key: "nav.sites", Icon: Briefcase, match: starts("/chantiers") },
        { href: "/clients", key: "nav.clients", Icon: Users, match: starts("/clients") },
        { href: "/messages", key: "nav.messages", Icon: MessageCircle, match: starts("/messages") },
      ],
    },
    {
      label: "nav.group.config",
      items: [
        { href: "/fournisseurs", key: "nav.suppliers", Icon: Boxes, match: starts("/fournisseurs") },
        { href: "/realisations", key: "nav.portfolio", Icon: Images, match: starts("/realisations") },
        { href: "/profil-public", key: "nav.publicProfile", Icon: Store, match: starts("/profil-public") },
        { href: "/modele-devis", key: "nav.docDesign", Icon: LayoutTemplate, match: starts("/modele-devis") },
        { href: "/reglages", key: "nav.settings", Icon: Settings, match: starts("/reglages") },
        { href: "/guide", key: "nav.guide", Icon: BookOpen, match: starts("/guide") },
        { href: "/compte", key: "nav.account", Icon: UserCircle, match: starts("/compte") },
      ],
    },
  ],
};

// Le mode MVP ne masque que les écrans avancés, pas la vitrine publique.
const MENUISIER: Nav = MVP
  ? { ...FULL_MENUISIER, groups: FULL_MENUISIER.groups.map((g) => ({ ...g, items: g.items.filter((i) => !HIDDEN.some((h) => i.href === h)) })).filter((g) => g.items.length) }
  : FULL_MENUISIER;

const FULL_CLIENT: Nav = {
  home: "/espace-client",
  cta: { href: "/espace-client/nouvelle", key: "cl.newRequest", Icon: FilePlus2, match: starts("/espace-client/nouvelle") },
  groups: [
    {
      label: "nav.group.main",
      items: [
        { href: "/espace-client", key: "cl.myRequests", Icon: ClipboardList, match: (p) => p === "/espace-client" || p.startsWith("/espace-client/devis") },
        { href: "/messages", key: "nav.messages", Icon: MessageCircle, match: starts("/messages") },
        { href: "/menuisiers", key: "cl.findJoiner", Icon: Search, match: starts("/menuisiers") },
      ],
    },
    { label: "nav.group.config", items: [{ href: "/compte", key: "nav.account", Icon: UserCircle, match: starts("/compte") }] },
  ],
};

const CLIENT: Nav = MVP
  ? { home: FULL_CLIENT.home, cta: FULL_CLIENT.cta, groups: FULL_CLIENT.groups.map((g) => ({ ...g, items: g.items.filter((i) => !HIDDEN_CLIENT.includes(i.href)) })) }
  : FULL_CLIENT;

// L'administrateur garde l'accès aux écrans du menuisier, sous l'espace « Administration ».
const ADMIN: Nav = {
  home: "/admin",
  groups: [
    {
      label: "nav.group.admin",
      items: [
        { href: "/admin", key: "admin.dashboard", Icon: Gauge, match: (p) => p === "/admin" },
        { href: "/admin/comptes", key: "admin.accounts", Icon: Users, match: starts("/admin/comptes") },
        { href: "/admin/devis", key: "admin.allQuotes", Icon: FileText, match: starts("/admin/devis") },
        { href: "/admin/reseaux", key: "admin.social", Icon: Share2, match: starts("/admin/reseaux") },
        { href: "/admin/retours", key: "admin.feedback", Icon: MessageSquareText, match: starts("/admin/retours") },
        { href: "/admin/journal", key: "admin.audit", Icon: ScrollText, match: starts("/admin/journal") },
      ],
    },
    ...MENUISIER.groups,
  ],
};

// usePathname() est lu à l'exécution : isolé dans Suspense pour garder le reste du layout prérendu.
function NavLinks({ nav, onNavigate }: { nav: Nav; onNavigate: () => void }) {
  const { t } = useI18n();
  const path = usePathname();
  const creating = !!nav.cta?.match(path);
  const unread = useUnread();
  return (
    <nav aria-label={t("nav.main")} className="flex flex-1 flex-col gap-6 px-4">
      {nav.cta && (
        <Link
          href={nav.cta.href}
          onClick={onNavigate}
          aria-current={creating ? "page" : undefined}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-(--side-bg) shadow-sm transition hover:bg-white/90"
        >
          <FilePlus2 size={18} aria-hidden />
          {t(nav.cta.key)}
        </Link>
      )}
      {nav.groups.map((g) => (
        <div key={g.label}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-(--side-muted)">{t(g.label)}</p>
          <ul className="space-y-1">
            {g.items.map(({ href, key, Icon, match }) => {
              const active = match(path);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${active ? "bg-(--side-active) text-white" : "text-(--side-fg) hover:bg-(--side-hover) hover:text-white"}`}
                  >
                    {active && <span aria-hidden className="absolute -left-4 top-2 bottom-2 w-1 rounded-r-full bg-(--side-accent)" />}
                    <Icon size={18} aria-hidden className={active ? "shrink-0 text-(--side-accent)" : "shrink-0"} />
                    <span className="min-w-0 break-words">{t(key)}</span>
                    {href === "/messages" && <CountBadge n={unread} label={`${unread} ${t("msg.unread")}`} className="ml-auto !ring-0" />}
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

// Le contenu défile dans son propre cadre (≥ lg) : le routeur ne le remonte pas, on le fait à chaque changement de page.
function ScrollTop() {
  const path = usePathname();
  useEffect(() => { document.getElementById("scroller")?.scrollTo(0, 0); }, [path]);
  return null;
}

function PageTitle({ nav }: { nav: Nav }) {
  const { t } = useI18n();
  const path = usePathname();
  const cur = [...(nav.cta ? [nav.cta] : []), ...nav.groups.flatMap((g) => g.items)].find((i) => i.match(path));
  return cur ? <p className="min-w-0 truncate text-[15px] font-semibold sm:text-sm sm:text-muted">{t(cur.key)}</p> : null;
}

// Pied du tiroir mobile : qui est connecté, et la déconnexion à portée de pouce.
function DrawerUser({ name, email, avatar }: { name: string; email?: string | null; avatar?: string | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const logout = async () => {
    await request("POST", "/api/auth/logout");
    router.replace("/connexion");
  };
  return (
    <div className="mx-4 mt-6 flex items-center gap-3 rounded-2xl bg-(--side-hover) p-3 lg:hidden">
      <Avatar name={name} src={avatar ?? undefined} size={40} round />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        {email && <p className="truncate text-xs text-(--side-muted)">{email}</p>}
      </div>
      <button type="button" onClick={logout} aria-label={t("menu.logout")} data-tooltip={t("menu.logout")} className="grid size-10 shrink-0 place-items-center rounded-full text-(--side-fg) transition-colors hover:bg-(--side-active)">
        <LogOut size={18} aria-hidden />
      </button>
    </div>
  );
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
  const nav = me?.role === "client" ? CLIENT : me?.role === "admin" ? ADMIN : MENUISIER;
  const [open, setOpen] = useState(false);

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
    <div className="app-frame min-h-screen lg:fixed lg:inset-0 lg:grid lg:grid-cols-[17rem_1fr] lg:overflow-clip">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:p-3">
        {t("nav.skip")}
      </a>

      {open && <div className="fixed inset-0 z-30 bg-black/55 backdrop-blur-[2px] lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <aside ref={sidebar} id="app-navigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(20rem,86vw)] flex-col overflow-y-auto overscroll-contain rounded-r-3xl bg-(--side-bg) pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 shadow-2xl transition-transform duration-200 lg:static lg:h-dvh lg:w-auto lg:translate-x-0 lg:rounded-none lg:pb-6 lg:shadow-none ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="mb-8 flex items-start justify-between px-6">
          <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3">
            <Brand light compact />
            <span>
              <span className="block text-xl font-bold leading-tight tracking-tight text-white">AluMg</span>
              <span className="block text-xs leading-tight text-(--side-muted)">{t(me?.role === "client" ? "ui.client" : me?.role === "admin" ? "nav.group.admin" : "ui.professional")}</span>
            </span>
          </Link>
          <button type="button" className="grid size-10 place-items-center rounded-full bg-(--side-hover) text-(--side-fg) transition-colors hover:bg-(--side-active) lg:hidden" onClick={() => { setOpen(false); toggle.current?.focus(); }} aria-label={t("menu.close")}>
            <X size={20} aria-hidden />
          </button>
        </div>
        <Suspense fallback={null}>
          {me && <NavLinks nav={nav} onNavigate={() => setOpen(false)} />}
        </Suspense>
        {me?.role === "menuisier" && (
          <button type="button" onClick={() => { setOpen(false); openTariffs(); }} className="mx-4 mt-4 flex min-h-11 items-center gap-3 rounded-xl border border-(--side-active) px-3 text-sm font-medium text-(--side-fg) transition-colors hover:bg-(--side-hover) lg:hidden">
            <BadgePercent size={18} aria-hidden className="text-(--side-accent)" />
            {t("tariffs.title")}
          </button>
        )}
        {me && <DrawerUser name={me.name} email={me.email || me.phone} avatar={me.avatar} />}
      </aside>

      <div id="scroller" className="min-w-0 lg:h-dvh lg:overflow-y-auto lg:overscroll-contain">
        <header id="topbar" className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-line bg-surface px-3 sm:gap-3 sm:px-8">
          <button ref={toggle} data-tour="menu" aria-controls="app-navigation" type="button" className="relative -ml-1 grid size-11 shrink-0 place-items-center rounded-xl text-ink transition-colors hover:bg-surface-2 active:bg-surface-2 lg:hidden" onClick={() => setOpen(true)} aria-label={`${t("menu.open")}${unread ? ` (${unread} ${t("msg.unread")})` : ""}`} aria-expanded={open}>
            <AlignLeft size={24} strokeWidth={2} aria-hidden />
          </button>
          <Suspense fallback={null}>
            <ScrollTop />
            <PageTitle nav={nav} />
          </Suspense>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {me && (
              <Link href="/messages" className="relative grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-ink lg:hidden" aria-label={unread > 0 ? `${t("nav.messages")}, ${unread} ${t("msg.unread")}` : t("nav.messages")}>
                <MessageCircle size={18} aria-hidden />
                <CountBadge n={unread} className="absolute -right-1 -top-1" />
              </Link>
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
              <button type="button" data-tour="tariffs" onClick={openTariffs} className="hidden h-10 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm font-medium transition-colors hover:bg-surface-2 lg:flex" data-tooltip={t("tariffs.sub")}>
                <BadgePercent size={16} aria-hidden className="text-primary" />
                {t("tariffs.title")}
              </button>
            )}
            <div className="hidden items-center gap-2 sm:flex">
              <LangMenu />
              <ThemeSwitch />
            </div>
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[110rem] px-4 pb-20 pt-6 sm:px-8 xl:px-10">
          {me?.mustChangePassword && (
            <p role="status" className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-medium">
              {t("account.mustChangeBanner")}
              <Link href="/compte" className="text-primary underline">{t("account.mustChangeGo")}</Link>
            </p>
          )}
          {children}
        </main>
        {me?.role === "menuisier" && <TariffsPanel />}
        <Suspense fallback={null}>
          <ChatWidget />
        </Suspense>
        <AppUpdate />
      </div>
    </div>
  );
}
