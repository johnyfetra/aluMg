"use client";
import { useSyncExternalStore } from "react";
import { type Quote, type Settings, withDefaults } from "@/lib/model";

// Données de l'application : réglages et devis gardés dans le téléphone (localStorage du WebView), sans compte ni serveur.
// shortcut: localStorage (~5 Mo) suffit pour des centaines de devis sans photo ; passer à IndexedDB si les devis portent des images.
const SETTINGS = "alumg.app.settings";
const QUOTES = "alumg.app.quotes";

// Premier lancement : garde-corps au mètre linéaire, le reste au m² (modifiable dans les réglages).
const APP_DEFAULTS: Partial<Settings> = { accent: "#1a74c7", tariffUnits: { "garde-corps.barreaudage": "ml", "garde-corps.verre": "ml" } };

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};
// instantanés gardés en mémoire : useSyncExternalStore exige la même référence tant que rien n'a changé
let cache: { settings?: Settings; quotes?: Quote[] } = {};

function read<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value)); // stockage plein : l'erreur remonte, l'appelant prévient l'utilisateur
  cache = {};
  listeners.forEach((l) => l());
}

const getSettings = () => (cache.settings ??= withDefaults({ ...APP_DEFAULTS, ...read<Partial<Settings>>(SETTINGS) }));
const getQuotes = () => (cache.quotes ??= read<Quote[]>(QUOTES) ?? []);

// Prérendu de l'export statique : rien à lire, la page s'affiche une fois dans le téléphone.
export function useSettings() {
  const settings = useSyncExternalStore(subscribe, getSettings, () => undefined);
  return { settings, save: (s: Settings) => write(SETTINGS, s) };
}

export function useQuotes() {
  const quotes = useSyncExternalStore(subscribe, getQuotes, () => undefined);
  return { quotes, save: saveQuote, remove: (id: string) => write(QUOTES, getQuotes().filter((q) => q.id !== id)) };
}

// Numéro DV-AAAA-NNNN, à la suite du plus grand numéro de l'année.
export function nextNumber(quotes: Pick<Quote, "number">[], now = new Date()) {
  const prefix = `DV-${now.getFullYear()}-`;
  const last = Math.max(0, ...quotes.filter((q) => q.number.startsWith(prefix)).map((q) => Number(q.number.slice(prefix.length)) || 0));
  return `${prefix}${String(last + 1).padStart(4, "0")}`;
}

function saveQuote(q: Quote) {
  const all = getQuotes();
  const i = all.findIndex((x) => x.id === q.id);
  write(QUOTES, i < 0 ? [q, ...all] : all.map((x, j) => (j === i ? q : x)));
}

