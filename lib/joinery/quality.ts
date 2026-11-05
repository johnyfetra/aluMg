// Profils de qualité du rendu 3D : éco (appareils modestes), équilibré, élevé. Choisis automatiquement d'après l'appareil, modifiables et mémorisés par l'utilisateur.
export type Quality = "eco" | "balanced" | "high";
export type QualitySettings = {
  dpr: [number, number]; // résolution de rendu (min, max) par rapport à l'écran
  shadows: boolean; // ombres portées de l'ouvrage
  shadowMap: number; // taille de la carte d'ombre
  transmission: boolean; // vitrage physique (transmission, réfraction) ; sinon verre transparent simple, bien moins coûteux
  contactShadows: boolean;
  profileDetail: boolean; // sections détaillées des profilés (chambres, feuillures)
};

export const QUALITY: Record<Quality, QualitySettings> = {
  eco: { dpr: [1, 1], shadows: false, shadowMap: 512, transmission: false, contactShadows: false, profileDetail: true },
  balanced: { dpr: [1, 1.5], shadows: true, shadowMap: 1024, transmission: false, contactShadows: true, profileDetail: true },
  high: { dpr: [1, 2], shadows: true, shadowMap: 2048, transmission: true, contactShadows: true, profileDetail: true },
};

export const QUALITIES = ["eco", "balanced", "high"] as const satisfies readonly Quality[];
export const isQuality = (v: unknown): v is Quality => QUALITIES.includes(v as Quality);

// Choix automatique : écran tactile avec peu de mémoire ou de cœurs → éco ; tactile récent ou ordinateur modeste → équilibré ; ordinateur confortable → élevé.
export function autoQuality(env: { coarsePointer: boolean; cores?: number; memoryGb?: number; reducedMotion?: boolean }): Quality {
  const cores = env.cores ?? 4;
  const mem = env.memoryGb ?? 4;
  if (env.reducedMotion) return "eco";
  if (env.coarsePointer) return cores >= 8 && mem >= 6 ? "balanced" : "eco";
  return cores >= 8 && mem >= 8 ? "high" : "balanced";
}

const KEY = "alumg.quality3d";
export function readQuality(): Quality {
  const forced = new URLSearchParams(location.search).get("q3d"); // ?q3d=eco|balanced|high : essais et mesures
  if (isQuality(forced)) return forced;
  try {
    const saved = localStorage.getItem(KEY);
    if (isQuality(saved)) return saved;
  } catch { /* stockage indisponible : choix automatique */ }
  const nav = navigator as Navigator & { deviceMemory?: number };
  return autoQuality({ coarsePointer: matchMedia("(pointer: coarse)").matches, cores: navigator.hardwareConcurrency, memoryGb: nav.deviceMemory, reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches });
}
export function saveQuality(q: Quality) {
  try { localStorage.setItem(KEY, q); } catch { /* sans stockage : valable pour cette session seulement */ }
}
