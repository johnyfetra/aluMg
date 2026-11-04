// Pastille rouge du nombre d'éléments non lus (cloche, menu, messagerie) : même rouge et même contraste dans les deux thèmes.
export default function CountBadge({ n, label, className = "" }: Readonly<{ n: number; label?: string; className?: string }>) {
  if (n <= 0) return null;
  return (
    <span {...(label ? { "aria-label": label } : { "aria-hidden": true })} className={`grid h-5 min-w-5 place-items-center rounded-full bg-[#d92d20] px-1 text-[11px] font-bold leading-none text-white ring-2 ring-surface ${className}`}>
      {n > 9 ? "9+" : n}
    </span>
  );
}
