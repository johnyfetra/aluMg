"use client";
import { Check, ChevronDown, Globe, LogOut, Moon, Settings, ShieldCheck, Sun, UserCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Menu, { menuItem } from "./Menu";
import { Avatar } from "./ui";
import { request, useMe } from "@/lib/client";
import { LOCALES, type Locale, useI18n } from "@/lib/i18n";
import { type Theme, setTheme, useTheme } from "@/lib/theme";

// Commutateur de thème : deux boutons (clair, sombre), l'actif est mis en évidence et annoncé (aria-pressed).
export function ThemeSwitch() {
  const { t } = useI18n();
  const theme = useTheme();
  const opt = (value: Theme, Icon: typeof Sun, label: string) => (
    <button
      type="button"
      aria-pressed={theme === value}
      aria-label={label}
      title={label}
      onClick={() => setTheme(value)}
      className={`grid size-9 place-items-center rounded-full transition-colors ${theme === value ? "bg-primary text-on-primary shadow-sm" : "text-muted hover:text-ink"}`}
    >
      <Icon size={16} aria-hidden />
    </button>
  );
  return (
    <div role="group" aria-label={t("theme.toggle")} className="flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5">
      {opt("light", Sun, t("theme.light"))}
      {opt("dark", Moon, t("theme.dark"))}
    </div>
  );
}

export function LangMenu() {
  const { t, locale, setLocale } = useI18n();
  return (
    <Menu
      label={`${t("lang.label")}, ${LOCALES[locale]}`}
      width="w-52"
      triggerClass="flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm font-medium transition-colors hover:bg-surface-2"
      trigger={
        <>
          <Globe size={16} aria-hidden className="text-muted" />
          <span className="hidden sm:inline">{LOCALES[locale]}</span>
          <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-bold uppercase text-muted sm:hidden">{locale}</span>
          <ChevronDown size={14} aria-hidden className="text-muted" />
        </>
      }
    >
      {(close) => (
        <>
          <p className="px-3 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{t("lang.label")}</p>
          {(Object.entries(LOCALES) as [Locale, string][]).map(([k, name]) => (
            <button
              key={k}
              type="button"
              role="menuitemradio"
              aria-checked={k === locale}
              lang={k}
              className={`${menuItem} ${k === locale ? "bg-surface-2 font-semibold" : ""}`}
              onClick={() => {
                setLocale(k);
                close();
              }}
            >
              <span className="grid size-7 place-items-center rounded-md bg-surface-2 text-[11px] font-bold uppercase text-muted">{k}</span>
              <span className="flex-1">{name}</span>
              {k === locale && <Check size={16} aria-hidden className="text-primary" />}
            </button>
          ))}
        </>
      )}
    </Menu>
  );
}

export function UserMenu() {
  const { t, locale, setLocale } = useI18n();
  const { data: me } = useMe();
  const router = useRouter();
  const logout = async () => {
    await request("POST", "/api/auth/logout");
    router.replace("/connexion");
  };
  return (
    <Menu
      label={t("nav.account")}
      width="w-64"
      triggerClass="flex h-10 items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-1 transition-colors hover:bg-surface-2 sm:pr-3"
      trigger={
        <>
          <Avatar name={me?.name ?? "?"} src={me?.avatar} size={32} round />
          <span className="hidden max-w-36 truncate text-sm font-medium md:block">{me?.name}</span>
          <ChevronDown size={14} aria-hidden className="hidden text-muted sm:block" />
        </>
      }
    >
      {(close) => (
        <>
          <div className="mb-1 flex items-center gap-3 rounded-lg bg-surface-2 p-3">
            <Avatar name={me?.name ?? "?"} src={me?.avatar} size={40} round />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{me?.name}</p>
              <p className="truncate text-xs text-muted">{me?.email || me?.phone}</p>
              {me?.role === "admin" && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  <ShieldCheck size={11} aria-hidden /> Admin
                </span>
              )}
            </div>
          </div>
          {/* langue et thème : dans l'en-tête sur grand écran, ici sur mobile pour ne pas surcharger la barre */}
          <div className="space-y-2 border-t border-line px-1 pb-2 pt-3 sm:hidden">
            <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("lang.label")}</p>
            <div role="radiogroup" aria-label={t("lang.label")} className="grid grid-cols-3 gap-1.5 px-2">
              {(Object.entries(LOCALES) as [Locale, string][]).map(([k, name]) => (
                <button key={k} type="button" role="radio" aria-checked={k === locale} lang={k} title={name} onClick={() => setLocale(k)} className={`min-h-10 rounded-lg border text-sm font-bold uppercase ${k === locale ? "border-primary bg-primary/10 text-primary" : "border-line text-muted hover:bg-surface-2"}`}>
                  {k}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 px-2">
              <span className="text-sm font-medium">{t("theme.toggle")}</span>
              <ThemeSwitch />
            </div>
          </div>
          <Link href="/compte" role="menuitem" className={menuItem} onClick={close}><UserCircle size={17} aria-hidden className="text-muted" />{t("nav.account")}</Link>
          <Link href="/reglages" role="menuitem" className={menuItem} onClick={close}><Settings size={17} aria-hidden className="text-muted" />{t("nav.settings")}</Link>
          <div className="my-1 border-t border-line" />
          <button type="button" role="menuitem" className={`${menuItem} text-danger`} onClick={logout}><LogOut size={17} aria-hidden />{t("menu.logout")}</button>
        </>
      )}
    </Menu>
  );
}
