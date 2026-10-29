import { Check } from "lucide-react";
import { FINISHES, type FinishId } from "@/lib/model";

// Échantillons de couleur de profilé, rendus comme des plaquettes d'atelier : laqué (aplat avec reflet), anodisé (métal brossé), effet bois (veinage).
// Le nom de la couleur est toujours écrit à côté ou en dessous : la couleur seule ne porte pas l'information.
const finishStyle = (id: FinishId): React.CSSProperties => {
  const f = FINISHES.find((x) => x.id === id) ?? FINISHES[0];
  const sheen = "linear-gradient(135deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 46%, rgba(0,0,0,0.14) 100%)";
  if (f.group === "anodise") return { background: `repeating-linear-gradient(90deg, rgba(255,255,255,0.16) 0 1px, transparent 1px 3px), linear-gradient(120deg, ${f.hex} 0%, rgba(255,255,255,0.55) 30%, ${f.hex} 52%, rgba(0,0,0,0.22) 78%, ${f.hex} 100%)` };
  if (f.group === "fauxbois") return { background: `repeating-linear-gradient(101deg, rgba(0,0,0,0.16) 0 1.5px, transparent 1.5px 6px), repeating-linear-gradient(97deg, rgba(255,255,255,0.12) 0 1px, transparent 1px 9px), ${sheen}, ${f.hex}` };
  return { background: `${sheen}, ${f.hex}` };
};

export function FinishSwatch({ id, size = 24, className = "" }: { id: FinishId; size?: number; className?: string }) {
  return <span aria-hidden className={`inline-block shrink-0 rounded-md shadow-[inset_0_0_0_1px_rgba(0,0,0,0.22),0_1px_1px_rgba(0,0,0,0.12)] ${className}`} style={{ width: size, height: size, ...finishStyle(id) }} />;
}

// Plaquette sélectionnable (liste de choix) : échantillon + coche quand elle est choisie.
export function SwatchCheck({ id, size = 40, checked }: { id: FinishId; size?: number; checked: boolean }) {
  return (
    <span className="relative inline-block">
      <FinishSwatch id={id} size={size} />
      {checked && <span aria-hidden className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-primary text-on-primary shadow"><Check size={11} strokeWidth={3} /></span>}
    </span>
  );
}

// Verres : teinte réelle (clair, teinté, miroir…) pour les listes de choix.
const GLASS: Record<string, string> = {
  clair: "linear-gradient(135deg,#eaf4ff,#cfe3f7)", "teinte-bronze": "linear-gradient(135deg,#d9b38c,#8a6a4a)", "teinte-gris": "linear-gradient(135deg,#aab2bb,#5f6872)", "teinte-vert": "linear-gradient(135deg,#a9cdb4,#55806a)",
  reflechissant: "linear-gradient(135deg,#e5eef7 0%,#8fa7bd 50%,#dfe9f2 100%)", feuillete: "linear-gradient(135deg,#dcecff,#b9d4ee)", trempe: "linear-gradient(135deg,#d6e9fb,#a8c8e6)", depoli: "repeating-linear-gradient(45deg,#eceff2 0 2px,#dfe3e8 2px 4px)",
};
export function GlassSwatch({ id, size = 22 }: { id: string; size?: number }) {
  return <span aria-hidden className="inline-block shrink-0 rounded-md shadow-[inset_0_0_0_1px_rgba(0,0,0,0.2)]" style={{ width: size, height: size, background: GLASS[id] ?? GLASS.clair }} />;
}
