"use client";
import type { Point, Unit } from "@/lib/admin";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";

// Histogramme d'une série (inscriptions, connexions…) au style du tableau de bord ; un tableau masqué en donne les valeurs aux lecteurs d'écran.
// Chargé à la demande (next/dynamic) par la page d'administration.
export default function SeriesChart({ title, points, unit, color }: { title: string; points: Point[]; unit: Unit; color: string }) {
  const { t, locale } = useI18n();
  const fmt = new Intl.DateTimeFormat(DATE_LOCALE[locale], unit === "day" ? { day: "numeric", month: "short" } : unit === "month" ? { month: "short", year: "2-digit" } : { year: "numeric" });
  const label = (k: string) => (unit === "year" ? k : fmt.format(new Date(`${unit === "month" ? `${k}-01` : k}T12:00:00`)));
  const data = points.map((p) => ({ label: label(p.k), n: p.n }));
  const max = Math.max(1, ...data.map((d) => d.n));
  const total = data.reduce((a, d) => a + d.n, 0);
  const W = 600, H = 160, top = 8;
  const plotH = H - top;
  const slot = W / data.length;
  const bw = Math.min(48, slot * 0.6);
  // axe en HTML, lisible à toute largeur : toutes les étiquettes jusqu'à 7 barres, sinon début, milieu et fin
  const ticks = data.length <= 7 ? data : [data[0], data[Math.floor(data.length / 2)], data[data.length - 1]];

  return (
    <figure className="card">
      <figcaption className="mb-3 flex items-baseline justify-between gap-3">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-muted"><strong className="text-lg text-ink">{total}</strong> {t("admin.onPeriod")}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden className="w-full">
        {[0, 0.5, 1].map((r) => <line key={r} x1={0} x2={W} y1={top + plotH * (1 - r)} y2={top + plotH * (1 - r)} stroke="var(--grid)" strokeWidth={1} />)}
        {data.map((d, i) => {
          const h = (d.n / max) * plotH;
          const x = i * slot + (slot - bw) / 2;
          const y = top + plotH - h;
          const r = Math.min(4, bw / 2, h);
          return (
            <g key={i}>
              <title>{`${d.label} : ${d.n}`}</title>
              <rect x={i * slot} y={top} width={slot} height={plotH} fill="transparent" />
              {h > 0 && <path d={`M${x},${top + plotH} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${top + plotH} Z`} fill={color} />}
            </g>
          );
        })}
      </svg>
      <div aria-hidden className="mt-2 flex justify-between gap-2 text-xs text-muted">{ticks.map((d, i) => <span key={i}>{d.label}</span>)}</div>
      <table className="sr-only">
        <caption>{`${title} · ${t("admin.chartTable")}`}</caption>
        <thead><tr><th scope="col">{t("admin.date")}</th><th scope="col">{t("admin.count")}</th></tr></thead>
        <tbody>{data.map((d, i) => <tr key={i}><td>{d.label}</td><td>{d.n}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
