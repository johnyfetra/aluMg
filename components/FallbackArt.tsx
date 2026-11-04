"use client";
import { useId } from "react";

// Image de repli du site : une illustration vectorielle d'ouvrage en aluminium (fenêtre, porte ou volet) devant un mur et un jardin, aux couleurs du thème (clair et sombre,
// classes `.fb-*` de globals.css). C'est volontairement un dessin étiqueté « photo à venir » : une photo manquante n'est jamais remplacée par une fausse réalisation.
export type FallbackKind = "window" | "door" | "shutter";

// Catégorie de réalisation (spécialité) → dessin qui lui ressemble.
export const fallbackKind = (category?: string): FallbackKind => (category === "portes" ? "door" : category === "volets" ? "shutter" : "window");

export default function FallbackArt({ kind = "window", label, className = "" }: { kind?: FallbackKind; label: string; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 800 600" role="img" aria-label={label} preserveAspectRatio="xMidYMid slice" className={`block h-full w-full ${className}`}>
      <defs>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="fb-glass-a" />
          <stop offset="1" className="fb-glass-b" />
        </linearGradient>
      </defs>
      {/* mur, jardin, bordure de pelouse */}
      <rect width="800" height="600" className="fb-wall" />
      <rect y="470" width="800" height="130" className="fb-lawn" />
      <rect y="462" width="800" height="12" className="fb-edge" />
      {[[90, 500, 44], [170, 520, 30], [650, 505, 48], [730, 525, 30]].map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} className="fb-bush" />)}

      {kind === "window" && (
        <g>
          <rect x="230" y="120" width="340" height="280" rx="8" fill={`url(#${id}-glass)`} />
          <rect x="230" y="120" width="340" height="280" rx="8" className="fb-frame" strokeWidth={9} />
          <rect x="238" y="128" width="168" height="264" className="fb-frame" strokeWidth={6} />
          <rect x="394" y="136" width="168" height="248" className="fb-frame" strokeWidth={6} />
          <path d="M270 380 330 140M310 380 370 140M444 366 500 150" className="fb-thin" />
          <rect x="520" y="230" width="9" height="62" rx="4" className="fb-ink" />
          <rect x="205" y="404" width="390" height="18" rx="4" className="fb-sill" />
        </g>
      )}
      {kind === "door" && (
        <g>
          <rect x="310" y="80" width="180" height="382" rx="6" className="fb-frame" strokeWidth={9} />
          <rect x="324" y="94" width="152" height="170" fill={`url(#${id}-glass)`} />
          <path d="M350 250 392 104M392 250 430 104" className="fb-thin" />
          <rect x="324" y="264" width="152" height="16" className="fb-rail" />
          <rect x="324" y="280" width="152" height="168" className="fb-panel" />
          {Array.from({ length: 8 }, (_, i) => <line key={i} x1="324" x2="476" y1={296 + i * 20} y2={296 + i * 20} className="fb-groove" />)}
          <rect x="446" y="268" width="28" height="7" rx="3" className="fb-ink" />
          <circle cx="460" cy="296" r="4" className="fb-ink" />
        </g>
      )}
      {kind === "shutter" && (
        <g>
          <rect x="240" y="110" width="320" height="44" rx="6" className="fb-dark" />
          <rect x="248" y="154" width="14" height="260" className="fb-guide" />
          <rect x="538" y="154" width="14" height="260" className="fb-guide" />
          {Array.from({ length: 21 }, (_, i) => <rect key={i} x="264" y={158 + i * 12.2} width="272" height="10" rx="3" className={i % 2 ? "fb-slat-b" : "fb-slat-a"} />)}
          <rect x="262" y="408" width="276" height="12" rx="3" className="fb-dark" />
        </g>
      )}
      {/* étiquette */}
      <rect x="290" y="535" width="220" height="40" rx="20" className="fb-pill" />
      <text x="400" y="561" textAnchor="middle" className="fb-label">{label}</text>
    </svg>
  );
}
