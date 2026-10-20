"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { en } from "./messages/en";
import { fr, type Messages } from "./messages/fr";
import { mg } from "./messages/mg";

export const LOCALES = { fr: "Français", en: "English", mg: "Malagasy" } as const;
export type Locale = keyof typeof LOCALES;
const DICTS: Record<Locale, Messages> = { fr, en, mg };
// Intl ne connaît pas toujours « mg » : on formate les dates comme en français.
export const DATE_LOCALE: Record<Locale, string> = { fr: "fr-FR", en: "en-GB", mg: "fr-FR" };

export type T = (key: keyof Messages) => string;
const KEY = "alumg.locale";
const listeners = new Set<() => void>();

const read = (): Locale => {
  try {
    const v = localStorage.getItem(KEY);
    return v && v in LOCALES ? (v as Locale) : "fr";
  } catch {
    return "fr";
  }
};

const Ctx = createContext<{ locale: Locale; t: T; setLocale: (l: Locale) => void }>({
  locale: "fr",
  t: (k) => fr[k],
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    read,
    () => "fr" as Locale,
  );
  const setLocale = useCallback((l: Locale) => {
    try {
      localStorage.setItem(KEY, l);
    } catch {}
    listeners.forEach((x) => x());
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo(() => ({ locale, setLocale, t: ((k) => DICTS[locale][k]) as T }), [locale, setLocale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
