"use client";
import { useSyncExternalStore } from "react";

// Navigation par l'ancre (#/devis?id=…) : une seule page HTML, ce que sert sans surprise le serveur local de Capacitor.
// Chaque écran ajoute une entrée d'historique : le bouton retour d'Android revient à l'écran précédent.
export type Screen = "list" | "nouveau" | "devis" | "atelier" | "apercu" | "reglages";
const SCREENS: Screen[] = ["list", "nouveau", "devis", "atelier", "apercu", "reglages"];

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

export function useRoute() {
  const hash = useSyncExternalStore(subscribe, () => location.hash, () => "");
  const [path, query = ""] = hash.replace(/^#\/?/, "").split("?");
  const screen = SCREENS.includes(path as Screen) ? (path as Screen) : "list";
  return { screen, params: new URLSearchParams(query) };
}

export const href = (screen: Screen, params?: Record<string, string>) => `#/${screen}${params ? `?${new URLSearchParams(params)}` : ""}`;
export const go = (screen: Screen, params?: Record<string, string>) => void (location.hash = href(screen, params));
