"use client";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n";

// Menu plié (≥ lg) : posé sur <html data-nav="mini"> avant le premier rendu (voir app/layout.tsx), retenu d'une visite à l'autre.
// Suit l'attribut data-nav de <html> (menu plié), modifié par le bouton du menu.
function watchNav(cb: () => void) {
  const o = new MutationObserver(cb);
  o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-nav"] });
  return () => o.disconnect();
}

export function useMiniNav() {
  const mini = useSyncExternalStore(watchNav, () => document.documentElement.dataset.nav === "mini", () => false);
  const toggle = () => {
    const next = !mini;
    if (next) document.documentElement.dataset.nav = "mini"; else delete document.documentElement.dataset.nav;
    try { localStorage.setItem("alumg.nav", next ? "mini" : ""); } catch {}
  };
  return [mini, toggle] as const;
}

// Poignée de pliage, comme celle d'une baie coulissante, à hauteur du logo : glissée sous le bord de la barre (style .side-tab),
// on en voit le bout au repos (davantage quand le menu est plié), elle sort au survol du cadre group/side, au focus clavier, et reste sortie sur tactile.
export default function SideNavToggle({ controls }: { controls: string }) {
  const { t } = useI18n();
  const [mini, toggle] = useMiniNav();
  const label = t(mini ? "nav.expand" : "nav.collapse");
  return (
    <button type="button" onClick={toggle} aria-controls={controls} aria-expanded={!mini} aria-label={label} data-tooltip={label}
      className="side-tab absolute -right-3.5 top-7 z-30 hidden h-12 w-5 place-items-center rounded-full lg:grid">
      {mini ? <ChevronsRight size={13} strokeWidth={2.5} aria-hidden /> : <ChevronsLeft size={13} strokeWidth={2.5} aria-hidden />}
    </button>
  );
}
