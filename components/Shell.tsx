"use client";
import Brand from "./Brand";
import ChatWidget from "./ChatWidget";
import NotificationBell from "./NotificationBell";
import { FilePlus2, MessageCircle, FileText, LayoutDashboard, Menu as MenuIcon, Settings, UserCircle, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { LangMenu, ThemeSwitch, UserMenu } from "./Controls";
import { useI18n } from "@/lib/i18n";
import type { Messages } from "@/lib/messages/fr";

import { Boxes, Briefcase, ClipboardList, Images, LayoutTemplate, Search, Store, Users } from "lucide-react";
import { useSession, useUnread } from "@/lib/client";
import { HIDDEN, HIDDEN_CLIENT, MVP } from "@/lib/mvp";

type Item = { href: string; key: keyof Messages; Icon: typeof Settings; match: (p: string) => boolean };
type Group = { label: keyof Messages; items: Item[] };
type Nav = { home: string; cta?: Item; groups: Group[] }; // pas de bouton d'action principal en MVP côté client (la demande passe par l'annuaire, masqué)

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
        { href: "/compte", key: "nav.account", Icon: UserCircle, match: starts("/compte") },
      ],
    },
  ],
};

// En MVP, on retire du menu les pages masquées (et les groupes devenus vides).
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
  ? { home: FULL_CLIENT.home, groups: FULL_CLIENT.groups.map((g) => ({ ...g, items: g.items.filter((i) => !HIDDEN_CLIENT.includes(i.href)) })) }
  : FULL_CLIENT;

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
                    {href === "/messages" && unread > 0 && (
                      <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-(--side-accent) px-1.5 text-[11px] font-bold text-(--side-bg)" aria-label={`${unread} ${t("msg.unread")}`}>
                        {unread}
                      </span>
                    )}
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

function PageTitle({ nav }: { nav: Nav }) {
  const { t } = useI18n();
  const path = usePathname();
  const cur = [...(nav.cta ? [nav.cta] : []), ...nav.groups.flatMap((g) => g.items)].find((i) => i.match(path));
  return cur ? <p className="hidden truncate text-sm font-semibold text-muted sm:block">{t(cur.key)}</p> : null;
}

export default function Shell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { data: me } = useSession();
  const nav = me?.role === "client" ? CLIENT : MENUISIER;
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
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:p-3">
        {t("nav.skip")}
      </a>

      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <aside ref={sidebar} id="app-navigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col overflow-y-auto bg-(--side-bg) py-6 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="mb-8 flex items-start justify-between px-6">
          <Link href={nav.home} onClick={() => setOpen(false)} className="flex items-center gap-3">
            <Brand light compact />
            <span>
              <span className="block text-xl font-bold leading-tight tracking-tight text-white">AluMg</span>
              <span className="block text-xs leading-tight text-(--side-muted)">{t(me?.role === "client" ? "ui.client" : "ui.professional")}</span>
            </span>
          </Link>
          <button type="button" className="rounded-lg p-2 text-(--side-fg) hover:bg-(--side-hover) lg:hidden" onClick={() => { setOpen(false); toggle.current?.focus(); }} aria-label={t("menu.close")}>
            <X size={20} aria-hidden />
          </button>
        </div>
        <Suspense fallback={null}>
          {me && <NavLinks nav={nav} onNavigate={() => setOpen(false)} />}
        </Suspense>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface px-4 sm:px-8">
          <button ref={toggle} aria-controls="app-navigation" type="button" className="btn-secondary w-11 !px-0 lg:hidden" onClick={() => setOpen(true)} aria-label={t("menu.open")} aria-expanded={open}>
            <MenuIcon size={20} aria-hidden />
          </button>
          <Suspense fallback={null}>
            <PageTitle nav={nav} />
          </Suspense>
          <div className="ml-auto flex items-center gap-2">
            <LangMenu />
            <ThemeSwitch />
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[110rem] px-4 pb-20 pt-6 sm:px-8 xl:px-10">
          {children}
        </main>
        <Suspense fallback={null}>
          <ChatWidget />
        </Suspense>
      </div>
    </div>
  );
}
