"use client";
import { useI18n } from "@/lib/i18n";
import { FINISHES, type Line } from "@/lib/model";

// Coupe horizontale au montant d'une fenêtre ou d'une porte, à l'échelle : maçonnerie, dormant, joint, vantail, parclose, vitrage.
// Épaisseurs réelles : dormant 50 mm (gamme asiatique) ou 65 mm (européenne), profondeur 70 ou 90 mm, vitrage selon le choix (simple ou double).
export default function SectionView({ line: l }: { line: Pick<Line, "range" | "finish" | "thickness" | "glassType" | "category" | "infill"> }) {
  const { t } = useI18n();
  const euro = l.range === "europeen";
  const D = euro ? 90 : 70; // profondeur du profilé
  const tD = euro ? 65 : 50; // largeur du dormant
  const tS = 42; // largeur du vantail
  const hex = FINISHES.find((f) => f.id === l.finish)?.hex ?? "#f5f5f2";
  const double = l.thickness.includes("/");
  const [a, spacer, b] = double ? l.thickness.split("/").map(Number) : [Number(l.thickness), 0, 0];
  const glassT = double ? a + spacer + b : a;
  const k = 3.1; // pixels par millimètre
  const ox = 70; // décalage horizontal (mur à gauche)
  const oy = 112; // marge haute : les légendes sont posées au-dessus de la coupe
  const X = (mm: number) => ox + mm * k;
  const Y = (mm: number) => oy + mm * k;
  const ink = "#2b2f2c";
  const solid = (x: number, y: number, w: number, h: number, extra = "") => <rect x={X(x)} y={Y(y)} width={w * k} height={h * k} fill={hex} stroke={ink} strokeWidth={1.3} {...(extra ? { opacity: 1 } : {})} />;
  const hole = (x: number, y: number, w: number, h: number) => <rect x={X(x)} y={Y(y)} width={w * k} height={h * k} fill="#ffffff" fillOpacity={0.55} stroke={ink} strokeOpacity={0.55} strokeWidth={0.8} />;
  const sx = tD + 4; // début du vantail (jeu de 4 mm avec le dormant)
  const gx = sx + tS - 4; // le vitrage dépasse dans la feuillure du vantail
  const gy = (D - glassT) / 2;
  const label = (x: number, y: number, tx: number, ty: number, text: string, anchor: "start" | "end" = "start") => (
    <g key={text}>
      <line x1={X(x)} y1={Y(y)} x2={tx} y2={ty} stroke={ink} strokeWidth={0.9} />
      <circle cx={X(x)} cy={Y(y)} r={2.4} fill={ink} />
      <text x={anchor === "start" ? tx + 6 : tx - 6} y={ty + 4} textAnchor={anchor} fontSize={13} fontWeight={600} fill={ink}>{text}</text>
    </g>
  );
  const glassFill = l.glassType === "reflechissant" ? "#2a4f9c" : l.glassType.startsWith("teinte") ? "#8aa0a0" : "#bfe3f4";
  return (
    <figure className="space-y-2">
      <div className="overflow-x-auto rounded-xl bg-white p-2">
        <svg viewBox="0 0 560 420" role="img" aria-label={t("section.title")} className="mx-auto h-auto w-full max-w-[560px]">
          <defs>
            <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="7" stroke="#8b8478" strokeWidth="1" />
            </pattern>
          </defs>
          {/* maçonnerie */}
          <rect x={X(-22)} y={Y(-18)} width={22 * k} height={(D + 36) * k} fill="url(#hatch)" stroke={ink} strokeWidth={1.2} />
          {/* dormant avec deux chambres, feuillure et lumières */}
          {solid(0, 0, tD, D)}
          {hole(5, 8, tD - 22, 26)}
          {hole(5, 40, tD - 22, 26)}
          <rect x={X(tD - 12)} y={Y(D * 0.55)} width={12 * k} height={(D * 0.45) * k} fill="#ffffff" stroke={ink} strokeWidth={1.2} />
          {/* joint d'étanchéité entre dormant et vantail */}
          <rect x={X(tD - 1)} y={Y(D * 0.28)} width={5 * k} height={(D * 0.3) * k} fill="#1a1c1f" />
          {/* vantail : profilé à deux chambres, feuillure du vitrage */}
          {solid(sx, 8, tS, D - 16)}
          {hole(sx + 5, 14, tS - 18, 20)}
          {hole(sx + 5, D - 34, tS - 18, 20)}
          <rect x={X(gx - 1)} y={Y(gy - 4)} width={6 * k} height={(glassT + 8) * k} fill="#ffffff" stroke={ink} strokeWidth={1} />
          {/* vitrage : une ou deux feuilles séparées par l'intercalaire, joints noirs de chaque côté */}
          <rect x={X(gx)} y={Y(gy)} width={46 * k} height={(double ? a : glassT) * k} fill={glassFill} stroke={ink} strokeWidth={1.1} />
          {double && <rect x={X(gx)} y={Y(gy + a)} width={46 * k} height={spacer * k} fill="#ffffff" stroke={ink} strokeWidth={0.8} strokeDasharray="3 2" />}
          {double && <rect x={X(gx)} y={Y(gy + a + spacer)} width={46 * k} height={b * k} fill={glassFill} stroke={ink} strokeWidth={1.1} />}
          <rect x={X(gx - 2)} y={Y(gy - 2.5)} width={4 * k} height={2.5 * k} fill="#1a1c1f" />
          <rect x={X(gx - 2)} y={Y(gy + glassT)} width={4 * k} height={2.5 * k} fill="#1a1c1f" />
          {/* parclose : petit profilé clipsé qui maintient le vitrage */}
          <polygon points={`${X(gx - 8)},${Y(gy + glassT + 2.5)} ${X(gx + 2)},${Y(gy + glassT + 2.5)} ${X(gx + 2)},${Y(D - 8)} ${X(gx - 8)},${Y(D - 8)}`} fill={hex} stroke={ink} strokeWidth={1.1} />
          {/* cotes : profondeur du profilé, épaisseur du vitrage */}
          <line x1={X(0)} y1={Y(D + 14)} x2={X(0)} y2={Y(D + 20)} stroke={ink} /><line x1={X(0)} y1={Y(D + 17)} x2={X(sx + tS)} y2={Y(D + 17)} stroke={ink} strokeWidth={0.9} />
          <text x={X((sx + tS) / 2)} y={Y(D + 30)} textAnchor="middle" fontSize={12} fill={ink}>{tD + 4 + tS} mm</text>
          <line x1={X(-6)} y1={Y(0)} x2={X(-6)} y2={Y(D)} stroke={ink} strokeWidth={0.9} />
          <text x={X(-8)} y={Y(D / 2)} textAnchor="end" fontSize={12} fill={ink} transform={`rotate(-90 ${X(-8)} ${Y(D / 2)})`}>{D} mm</text>
          {/* légendes */}
          {label(-14, D * 0.15, X(-22), Y(-34), t("section.wall"))}
          {label(tD * 0.5, D * 0.2, X(0), Y(-16), t("section.frame"))}
          {label(tD + 1, D * 0.4, X(tD - 6), Y(-34), t("section.seal"))}
          {label(sx + tS * 0.6, 12, X(sx + tS * 0.5), Y(-16), t("section.sash"))}
          {label(gx + 30, gy + glassT / 2, X(gx + 14), Y(gy) - 64, `${t("section.glass")} ${l.thickness} mm`)}
          {label(gx - 3, D - 14, X(gx + 12), Y(D + 2), t("section.bead"))}
        </svg>
      </div>
      <figcaption className="text-xs text-muted">{t("section.note")}</figcaption>
    </figure>
  );
}
