// Illustration en aplats (style des tableaux de bord modernes) : baie coulissante alu, plante, mètre ruban.
// Couleurs tirées des jetons du thème : elle suit le mode clair et sombre. Purement décorative.
export default function WindowScene({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 220" className={className} aria-hidden focusable="false">
      {/* fond : tache douce et pointillés */}
      <path d="M40 190c-30-40-20-110 40-140s150-30 190 10 40 120-10 140-190 30-220-10z" fill="white" fillOpacity=".14" />
      <g fill="white" fillOpacity=".35">
        {[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => <circle key={`${r}-${c}`} cx={250 + c * 10} cy={24 + r * 10} r="1.6" />))}
      </g>
      {/* baie : dormant, vantail fixe, vantail coulissant entrouvert */}
      <rect x="92" y="38" width="150" height="136" rx="6" fill="#dbeafb" />
      <rect x="92" y="38" width="150" height="136" rx="6" fill="none" stroke="#0b2a4d" strokeOpacity=".25" strokeWidth="2" />
      <rect x="100" y="46" width="70" height="120" rx="3" fill="#bfe0fb" stroke="#ffffff" strokeWidth="5" />
      <rect x="150" y="46" width="84" height="120" rx="3" fill="#a5d3f8" stroke="#ffffff" strokeWidth="5" />
      <path d="M112 60l26-10v26l-26 10z M164 64l30-12v18l-30 12z" fill="white" fillOpacity=".55" />
      <rect x="156" y="98" width="4" height="20" rx="2" fill="var(--c2)" />
      <rect x="86" y="172" width="162" height="8" rx="4" fill="#ffffff" />
      {/* plante */}
      <path d="M58 178h30l-4 26H62z" fill="var(--c2)" />
      <path d="M73 178c-2-24-16-36-24-38 8 10 10 24 12 38z M73 178c2-28 14-44 26-48-10 12-14 30-14 48z M73 178c-4-18-2-34 4-46-1 16-1 30 0 46z" fill="var(--c4)" />
      {/* mètre ruban */}
      <rect x="250" y="168" width="34" height="30" rx="8" fill="var(--c2)" />
      <circle cx="267" cy="183" r="7" fill="#ffffff" fillOpacity=".9" />
      <path d="M250 192h-64v6h64z" fill="#ffe2bd" />
      <g stroke="#0b2a4d" strokeOpacity=".35" strokeWidth="1">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => <path key={i} d={`M${192 + i * 9} 192v${i % 2 ? 3 : 5}`} />)}
      </g>
      {/* étincelles */}
      <path d="M60 60l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#ffe2bd" />
      <path d="M280 110l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="white" fillOpacity=".7" />
    </svg>
  );
}
