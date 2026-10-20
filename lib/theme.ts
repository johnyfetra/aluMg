"use client";
import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

// Le thème vit dans <html data-theme> (posé avant le premier rendu) : on s'abonne à cet attribut.
const subscribe = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
};

export const useTheme = () => useSyncExternalStore<Theme>(subscribe, () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"), () => "light");

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("alumg.theme", theme);
  } catch {}
}
