// Pictogramme AluMg : deux pièces qui s'assemblent (vert atelier + bois). Fichiers SVG équivalents dans public/brand.
export function LogoMark({ size = 32, onDark = false, className }: { size?: number; onDark?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className={className}>
      <path d="M4 4h8v16h16v8H4z" fill={onDark ? "#F6F3ED" : "var(--logo)"} />
      <path d="M16 4h12v12H16z" fill="#C58A58" />
    </svg>
  );
}
