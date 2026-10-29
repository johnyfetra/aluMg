import { LogoMark } from "./Logo";
/** Deux profilés complémentaires : précision de l'assemblage et collaboration. */
export default function Brand({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-2.5 ${light ? "text-(--side-fg)" : "text-(--logo)"}`}>
      <LogoMark size={40} onDark={light} />
      <span className={compact ? "sr-only" : "text-2xl font-bold tracking-[-0.06em]"}>AluMg</span>
    </span>
  );
}
