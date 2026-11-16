"use client";
import { useSyncExternalStore } from "react";
import type { Quote } from "./model";

// Hors connexion : dernières données lues (réglages, devis, clients) et brouillons gardés dans le navigateur.
// Tout est effacé à la déconnexion : un téléphone partagé ne garde rien du compte précédent.
const PREFIX = "alumg.off.";
const DATA = `${PREFIX}data.`;
const DRAFT = `${PREFIX}draft.`;
const CACHED = new Set(["/api/me", "/api/session", "/api/settings", "/api/quotes", "/api/contacts"]);

function read<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // stockage plein ou interdit : l'application marche, seulement sans copie hors connexion
  }
}

export const isCached = (url: string) => CACHED.has(url);
export const readCached = <T,>(url: string) => read<T>(DATA + url);
export const writeCached = (url: string, data: unknown) => isCached(url) && write(DATA + url, data);

export const NEW_DRAFT = "new";
export const loadDraft = (id: string) => read<Quote>(DRAFT + id);
export const saveDraft = (id: string, q: Quote) => write(DRAFT + id, q);
export const clearDraft = (id: string) => {
  try {
    localStorage.removeItem(DRAFT + id);
  } catch {}
};

export async function clearOffline() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k));
  } catch {}
  navigator.serviceWorker?.controller?.postMessage({ type: "clear" });
}

// Pages du professionnel gardées dans le téléphone pour s'ouvrir sans réseau.
export const OFFLINE_PAGES = ["/tableau-de-bord", "/devis", "/devis/nouveau"];
export const warmOffline = () => navigator.serviceWorker?.controller?.postMessage({ type: "warm", urls: OFFLINE_PAGES });

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};
export const useOnline = () => useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
