// Pictogramme AluMg : deux pièces qui s'assemblent (bleu azur + orange). Fichiers SVG équivalents dans public/brand.
export function LogoMark({ size = 32, onDark = false, className }: { size?: number; onDark?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className={className}>
      <path d="M4 4h8v16h16v8H4z" fill={onDark ? "#EEF3F8" : "var(--logo)"} />
      <path d="M16 4h12v12H16z" fill="#FF9F43" />
    </svg>
  );
}
