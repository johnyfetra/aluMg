import type { SyntheticEvent } from "react";

// Image de repli statique (illustration AluMg) pour les <img> bruts : si le fichier ne charge pas, on affiche le dessin au lieu d'une image cassée.
export const FALLBACK_SRC = "/brand/fallback.svg";
export const onImgError = (e: SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget;
  if (!img.src.endsWith(FALLBACK_SRC)) img.src = FALLBACK_SRC; // une seule fois : jamais de boucle si le repli lui-même échoue
};
