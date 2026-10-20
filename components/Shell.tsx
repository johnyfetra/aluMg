"use client";
import { FilePlus2, FileText, LayoutDashboard, Menu as MenuIcon, Ruler, Settings, UserCircle, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { LangMenu, ThemeSwitch, UserMenu } from "./Controls";
import { useI18n } from "@/lib/i18n";
import type { Messages } from "@/lib/messages/fr";

type Item = { href: string; key: keyof Messages; Icon: typeof Settings; match: (p: string) => boolean };
const GROUPS: { label: keyof Messages; items: Item[] }[] = [
  {
    label: "nav.group.main",
    items: [
      { href: "/tableau-de-bord", key: "nav.dashboard", Icon: LayoutDashboard, match: (p) => p.startsWith("/tableau-de-bord") },
      { href: "/devis", key: "nav.quotes", Icon: FileText, match: (p) => p === "/devis" || (p.startsWith("/devis/") && p !== "/devis/nouveau") },
    ],
  },
  {
    label: "nav.group.config",
    items: [
      { href: "/reglages", key: "nav.settings", Icon: Settings, match: (p) => p.startsWith("/reglages") },
      { href: "/compte", key: "nav.account", Icon: UserCircle, match: (p) => p.startsWith("/compte") },
    ],
  },
];
const ALL = [...GROUPS.flatMap((g) => g.items), { href: "/devis/nouveau", key: "nav.new" as const, Icon: FilePlus2, match: (p: string) => p === "/devis/nouveau" }];

// usePathname() est lu à l'exécution : isolé dans Suspense pour garder le reste du layout prérendu.
function NavLinks({ onNavigate }: { onNavigate: () => void }) {
  const { t } = useI18n();
  const path = usePathname();
  const creating = path === "/devis/nouveau";
  return (
    <nav aria-label={t("nav.main")} className="flex flex-1 flex-col gap-6 px-4">
      <Link
        href="/devis/nouveau"
        onClick={onNavigate}
        aria-current={creating ? "page" : undefined}
        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-(--side-bg) shadow-sm transition hover:bg-white/90"
      >
        <FilePlus2 size={18} aria-hidden />
        {t("nav.new")}
      </Link>
      {GROUPS.map((g) => (
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
                    <Icon size={18} aria-hidden className={active ? "text-(--side-accent)" : ""} />
                    {t(key)}
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

function PageTitle() {
  const { t } = useI18n();
  const path = usePathname();
  const cur = ALL.find((i) => i.match(path));
  return cur ? <p className="hidden truncate text-sm font-semibold text-muted sm:block">{t(cur.key)}</p> : null;
}

export default function Shell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:p-3">
        {t("nav.skip")}
      </a>

      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-(--side-bg) py-6 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="mb-8 flex items-start justify-between px-6">
          <Link href="/tableau-de-bord" onClick={() => setOpen(false)} className="flex items-center gap-3">
            <span aria-hidden className="grid size-10 place-items-center rounded-xl bg-(--side-accent) text-(--side-bg)">
              <Ruler size={22} />
            </span>
            <span>
              <span className="block text-xl font-bold leading-tight tracking-tight text-white">AluMg</span>
              <span className="block text-xs leading-tight text-(--side-muted)">{t("app.tagline")}</span>
            </span>
          </Link>
          <button type="button" className="rounded-lg p-2 text-(--side-fg) hover:bg-(--side-hover) lg:hidden" onClick={() => setOpen(false)} aria-label={t("menu.close")}>
            <X size={20} aria-hidden />
          </button>
        </div>
        <Suspense fallback={null}>
          <NavLinks onNavigate={() => setOpen(false)} />
        </Suspense>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur sm:px-8">
          <button type="button" className="btn-secondary w-11 !px-0 lg:hidden" onClick={() => setOpen(true)} aria-label={t("menu.open")} aria-expanded={open}>
            <MenuIcon size={20} aria-hidden />
          </button>
          <Suspense fallback={null}>
            <PageTitle />
          </Suspense>
          <div className="ml-auto flex items-center gap-2">
            <LangMenu />
            <ThemeSwitch />
            <UserMenu />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[110rem] px-4 py-6 sm:px-8 xl:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
