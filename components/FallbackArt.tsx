"use client";
import { useId } from "react";

// Image de repli du site : un panorama en papier découpé qui raconte le métier (deux menuisiers posent une baie en aluminium sur un chantier, grue, bâtiment en
// construction, profilés et vitrages au sol, ville au loin), aux couleurs du thème (clair et sombre, classes `.fb-*` de globals.css).
// Le dessin est composé en 1600 × 400 avec le sujet au centre : il couvre tout cadre (bandeau très large, rectangle, carré) en rognant les côtés ou le haut, jamais le sujet.
// C'est volontairement un dessin étiqueté « photo à venir » : une photo manquante n'est jamais remplacée par une fausse réalisation.
export type FallbackKind = "window" | "door" | "shutter";
export type FallbackVariant = "card" | "banner";

// Catégorie de réalisation (spécialité) → ouvrage posé dans la scène.
export const fallbackKind = (category?: string): FallbackKind => (category === "portes" ? "door" : category === "volets" ? "shutter" : "window");

// Baie fermée par l'ouvrage fini (fenêtre, porte ou volet roulant) : dessin autonome mis à l'échelle de la baie.
function Product({ kind, id, x, y, w, h }: { kind: FallbackKind; id: string; x: number; y: number; w: number; h: number }) {
  const box = kind === "door" ? "0 0 180 380" : kind === "shutter" ? "0 0 320 310" : "0 0 340 280";
  return (
    <svg x={x} y={y} width={w} height={h} viewBox={box} preserveAspectRatio="xMidYMid meet" overflow="visible">
      {kind === "window" && (
        <g>
          <rect x="4" y="4" width="332" height="272" rx="6" fill={`url(#${id}-glass)`} />
          <rect x="4" y="4" width="332" height="272" rx="6" className="fb-frame" strokeWidth={9} />
          <rect x="12" y="12" width="160" height="256" className="fb-frame" strokeWidth={6} />
          <rect x="164" y="20" width="164" height="240" className="fb-frame" strokeWidth={6} />
          <path d="M44 252 100 28M80 252 136 28M214 240 266 40" className="fb-thin" />
          <rect x="290" y="110" width="9" height="60" rx="4" className="fb-ink" />
        </g>
      )}
      {kind === "door" && (
        <g>
          <rect x="4" y="4" width="172" height="372" rx="6" className="fb-frame" strokeWidth={9} />
          <rect x="18" y="18" width="144" height="160" fill={`url(#${id}-glass)`} />
          <path d="M44 166 82 30M84 166 120 30" className="fb-thin" />
          <rect x="18" y="178" width="144" height="14" className="fb-rail" />
          <rect x="18" y="192" width="144" height="170" className="fb-panel" />
          {Array.from({ length: 8 }, (_, i) => <line key={i} x1="18" x2="162" y1={208 + i * 19} y2={208 + i * 19} className="fb-groove" />)}
          <rect x="130" y="186" width="26" height="7" rx="3" className="fb-ink" />
        </g>
      )}
      {kind === "shutter" && (
        <g>
          <rect x="6" y="4" width="308" height="42" rx="6" className="fb-dark" />
          <rect x="12" y="46" width="14" height="248" className="fb-guide" />
          <rect x="294" y="46" width="14" height="248" className="fb-guide" />
          {Array.from({ length: 20 }, (_, i) => <rect key={i} x="28" y={50 + i * 12.2} width="264" height="10" rx="3" className={i % 2 ? "fb-slat-b" : "fb-slat-a"} />)}
          <rect x="24" y="294" width="272" height="12" rx="3" className="fb-dark" />
        </g>
      )}
    </svg>
  );
}


const GROUND = 330;
const STARS: [number, number, number][] = [[80, 40, 2], [190, 150, 1.5], [260, 30, 2], [380, 120, 1.5], [520, 28, 2], [640, 90, 1.5], [720, 40, 2], [900, 30, 1.5], [1000, 110, 2], [1090, 50, 1.5], [1340, 40, 2], [1450, 130, 1.5], [1540, 50, 2], [1300, 150, 1.5]]; // étoiles de la scène de nuit // ligne de sol de la composition
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

// Nuage en papier découpé : trois disques et une base plate.
const Cloud = ({ x, y, s = 1, tone = "fb-cloud" }: { x: number; y: number; s?: number; tone?: string }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} className={tone}>
    <circle cx="0" cy="0" r="26" /><circle cx="34" cy="-12" r="34" /><circle cx="76" cy="2" r="26" /><rect x="-26" y="0" width="128" height="26" rx="13" />
  </g>
);

// Immeubles au loin : hauteurs variées, baies en quadrillage.
const Skyline = ({ at, tone, base = GROUND }: { at: [number, number][]; tone: string; base?: number }) => (
  <g>
    {at.map(([x, h], i) => (
      <g key={i}>
        <rect x={x} y={base - h} width="58" height={h} className={tone} />
        {range(Math.max(1, Math.floor((h - 18) / 26))).flatMap((r) => [0, 1].map((c) => <rect key={`${r}${c}`} x={x + 10 + c * 24} y={base - h + 12 + r * 26} width="14" height="16" className={(i + r + c) % 3 === 0 ? "fb-cell fb-lit" : "fb-cell"} />))}
      </g>
    ))}
  </g>
);

// Grue à tour : mât, flèche, contrepoids, câble et charge (un cadre de fenêtre en aluminium).
const Crane = ({ x }: { x: number }) => (
  <g transform={`translate(${x} 0)`}>
    <path d="M0 330V80M16 330V80M0 330 16 304 0 278 16 252 0 226 16 200 0 174 16 148 0 122 16 96" className="fb-crane-line" />
    <rect x="-150" y="64" width="330" height="9" className="fb-crane" />
    <path d="M-150 73 8 36 180 73" className="fb-crane-line" />
    <rect x="-176" y="62" width="34" height="26" className="fb-crane" />
    <rect x="-4" y="76" width="24" height="20" rx="3" className="fb-crane" />
    <circle cx="8" cy="30" r="5" className="fb-night fb-beacon" />
    <path d="M140 73V150" className="fb-crane-line" />
    <g transform="translate(112 150)">
      <rect width="56" height="46" rx="3" className="fb-frame" strokeWidth={5} />
      <rect x="5" y="5" width="46" height="36" className="fb-win-glass" />
      <path d="M12 38 24 8" className="fb-thin" />
    </g>
    <path d="M114 150 140 126 166 150" className="fb-crane-line" />
  </g>
);

// Bâtiment en construction : dalles, poteaux, fers en attente, échafaudage devant.
const Shell = ({ x }: { x: number }) => (
  <g transform={`translate(${x} 0)`}>
    <rect x="0" y="150" width="200" height="180" className="fb-wall2" />
    {[0, 90, 184].map((dx) => <rect key={dx} x={dx} y="150" width="16" height="180" className="fb-col" />)}
    <rect x="-6" y="150" width="212" height="9" className="fb-slab" />
    <rect x="-6" y="238" width="212" height="9" className="fb-slab" />
    {[24, 50, 150].map((dx) => <path key={dx} d={`M${dx} 150V124`} className="fb-rebar" />)}
    <rect x="28" y="170" width="54" height="60" className="fb-hole" />
    <rect x="108" y="170" width="68" height="60" className="fb-hole" />
    <rect x="108" y="258" width="68" height="72" className="fb-hole" />
    <g transform="translate(206 0)">
      <rect x="0" y="110" width="6" height="220" className="fb-pole" /><rect x="64" y="110" width="6" height="220" className="fb-pole" />
      <rect x="-6" y="196" width="82" height="7" className="fb-plank" /><rect x="-6" y="120" width="82" height="7" className="fb-plank" />
      <path d="M3 203 67 127M67 203 3 127M3 330 67 203M67 330 3 203" className="fb-brace" />
    </g>
  </g>
);

// Menuisier de profil : casque, buste, jambes, bras tendus vers l'ouvrage (silhouette en papier découpé).
const Worker = ({ x, toward }: { x: number; toward: number }) => {
  const dir = Math.sign(toward - x);
  return (
    <g className="fb-person">
      <rect x={x - 11} y={GROUND - 54} width="9" height="54" rx="3" /><rect x={x + 2} y={GROUND - 54} width="9" height="54" rx="3" />
      <rect x={x - 15} y={GROUND - 112} width="30" height="64" rx="11" />
      <circle cx={x} cy={GROUND - 126} r="11" />
      <path d={`M${x - 14} ${GROUND - 128}a14 12 0 0 1 28 0z`} className="fb-helmet" /><rect x={x - 17} y={GROUND - 129} width="34" height="4" rx="2" className="fb-helmet" />
      <path d={`M${x + dir * 8} ${GROUND - 96}L${toward} ${GROUND - 84}`} className="fb-arm" />
    </g>
  );
};

// Profilés en aluminium appuyés au mur, tas de barres, rack de vitrages et caisse à outils.
const Stock = ({ x }: { x: number }) => (
  <g transform={`translate(${x} 0)`}>
    {range(5).map((i) => <rect key={i} x={i * 9} y="236" width="6" height="96" rx="2" transform={`rotate(${9 + i * 1.5} ${i * 9 + 3} 330)`} className={i % 2 ? "fb-slat-b" : "fb-slat-a"} />)}
    {range(4).map((i) => <rect key={i} x="64" y={316 - i * 9} width={110 - i * 4} height="7" rx="2" className={i % 2 ? "fb-slat-b" : "fb-slat-a"} />)}
    <rect x="190" y="312" width="52" height="18" rx="3" className="fb-dark" /><rect x="206" y="305" width="20" height="8" rx="3" className="fb-sill" />
  </g>
);
const Rack = ({ x }: { x: number }) => (
  <g transform={`translate(${x} 0)`}>
    <path d="M0 330 38 214 50 218 14 330Z" className="fb-slat-b" /><path d="M20 330 58 216 70 220 34 330Z" fill="url(#fb-rack)" opacity="0.9" /><path d="M40 330 78 220 90 224 54 330Z" className="fb-slat-a" />
    <rect x="-4" y="326" width="104" height="6" rx="2" className="fb-dark" />
  </g>
);
const Tree = ({ x, s = 1 }: { x: number; s?: number }) => (
  <g transform={`translate(${x} ${GROUND}) scale(${s})`}><rect x="-3" y="-30" width="6" height="30" className="fb-pole" /><circle cx="0" cy="-48" r="22" className="fb-bush" /><circle cx="14" cy="-36" r="14" className="fb-bush" /></g>
);

export default function FallbackArt({ kind = "window", variant = "card", label, description, className = "" }: { kind?: FallbackKind; variant?: FallbackVariant; label: string; description?: string; className?: string }) {
  const id = useId().replace(/:/g, "");
  const banner = variant === "banner";
  // l'ouvrage porté par les deux menuisiers, au centre de la scène
  const prod = kind === "door" ? { w: 52, h: 110 } : kind === "shutter" ? { w: 92, h: 90 } : { w: 104, h: 86 };
  const px = 800 - prod.w / 2;
  const py = GROUND - 56 - prod.h;
  return (
    <svg viewBox="0 0 1600 400" role="img" aria-label={description ?? label} preserveAspectRatio="xMidYMid slice" className={`block h-full w-full ${className}`}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="fb-sky-a" />
          <stop offset="1" className="fb-sky-b" />
        </linearGradient>
        <linearGradient id="fb-rack" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="fb-glass-a" />
          <stop offset="1" className="fb-glass-b" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="fb-glass-a" />
          <stop offset="1" className="fb-glass-b" />
        </linearGradient>
      </defs>
      <rect x="-2000" y="-2000" width="5600" height="4400" fill={`url(#${id}-sky)`} />
      {/* jour : soleil et oiseaux ; nuit : lune, étoiles, projecteur de chantier et fenêtres allumées (le thème choisit, voir `.fb-day` / `.fb-night`) */}
      <g className="fb-day"><circle cx="1210" cy="112" r="62" className="fb-sun" /><path d="M300 70l8-6 8 6M340 52l8-6 8 6M1010 60l8-6 8 6" className="fb-bird" /></g>
      <g className="fb-night">
        <path d="M1210 50a62 62 0 1 0 0 124a50 50 0 1 1 0-124z" className="fb-moon" />
        {STARS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} className="fb-star" />)}
      </g>
      <Cloud x={120} y={90} s={1.1} /><Cloud x={560} y={60} s={0.8} tone="fb-cloud2" /><Cloud x={1010} y={150} s={0.9} tone="fb-cloud2" /><Cloud x={1400} y={80} s={1.2} />
      {/* ville au loin, en deux plans */}
      <Skyline tone="fb-far" at={[[-60, 120], [30, 160], [110, 100], [190, 190], [270, 130], [1000, 150], [1090, 200], [1180, 120], [1270, 170], [1360, 110], [1450, 190], [1540, 140]]} />
      <Skyline tone="fb-mid" at={[[-20, 80], [60, 110], [150, 70], [1130, 90], [1230, 120], [1320, 80], [1420, 110]]} />
      <Crane x={420} />
      <Shell x={1030} />
      <Stock x={190} />
      <Rack x={600} />
      <Tree x={90} s={1.2} /><Tree x={1330} /><Tree x={1500} s={1.3} />
      {/* sol : deux plans de collines en papier */}
      <path d="M-50 400V342C150 320 330 330 520 336 700 342 900 322 1100 334 1300 346 1480 326 1650 338V400Z" className="fb-hill-a" />
      <path d="M-50 400V366C200 352 400 372 640 366 880 360 1060 374 1300 364 1450 358 1560 364 1650 366V400Z" className="fb-hill-b" />
      {/* projecteur de chantier (la nuit) : poteau, lampe et faisceau sur les menuisiers */}
      <g className="fb-night">
        <path d="M1004 176 726 332H980Z" className="fb-beam" />
        <rect x="1000" y="176" width="5" height="156" className="fb-pole" /><rect x="990" y="168" width="26" height="12" rx="4" className="fb-lamp" />
      </g>
      {/* sujet : deux menuisiers posent une baie en aluminium */}
      <Product kind={kind} id={id} x={px} y={py} w={prod.w} h={prod.h} />
      <Worker x={px - 26} toward={px} /><Worker x={px + prod.w + 26} toward={px + prod.w} />
      {/* étiquette : en bas pour une vignette, sur la gauche du sujet pour un bandeau (le bas est masqué par l'en-tête du profil) */}
      {banner ? (
        <g>
          <rect x="890" y="92" width="214" height="38" rx="19" className="fb-pill" />
          <text x="997" y="117" textAnchor="middle" className="fb-label">{label}</text>
        </g>
      ) : (
        <g>
          <rect x="693" y="358" width="214" height="34" rx="17" className="fb-pill" />
          <text x="800" y="381" textAnchor="middle" className="fb-label">{label}</text>
        </g>
      )}
    </svg>
  );
}
