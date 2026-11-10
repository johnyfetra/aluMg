"use client";
import { useState } from "react";
import type { Point, Unit } from "@/lib/admin";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";

// Courbe d'une série (visiteurs, inscriptions…) : ligne de 2 px et aire légère, réticule et infobulle au survol ou au doigt.
// `cumulative` : chaque point ajoute les précédents et `base` (total avant la fenêtre) : la courbe montre la croissance réelle.
// Un tableau masqué en donne les valeurs aux lecteurs d'écran. Chargé à la demande (next/dynamic) par la page d'administration.
export default function SeriesChart({ title, points, unit, color, cumulative = false, base = 0 }: { title: string; points: Point[]; unit: Unit; color: string; cumulative?: boolean; base?: number }) {
  const { t, locale } = useI18n();
  const [hover, setHover] = useState<number | null>(null);
  const fmt = new Intl.DateTimeFormat(DATE_LOCALE[locale], unit === "day" ? { day: "numeric", month: "short" } : unit === "month" ? { month: "short", year: "2-digit" } : { year: "numeric" });
  const label = (k: string) => (unit === "year" ? k : fmt.format(new Date(`${unit === "month" ? `${k}-01` : k}T12:00:00`)));
  const data = points.map((p, i) => ({ label: label(p.k), n: cumulative ? base + points.slice(0, i + 1).reduce((a, q) => a + q.n, 0) : p.n }));
  const sum = points.reduce((a, p) => a + p.n, 0);
  const max = Math.max(1, ...data.map((d) => d.n));
  const W = 600, H = 170, top = 10, bottom = 6;
  const plotH = H - top - bottom;
  const x = (i: number) => (data.length === 1 ? W / 2 : (i / (data.length - 1)) * W);
  const y = (n: number) => top + plotH * (1 - n / max);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.n).toFixed(1)}`).join(" ");
  const area = `${line} L${W},${top + plotH} L0,${top + plotH} Z`;
  const ticks = data.length <= 7 ? data.map((_, i) => i) : [0, Math.floor(data.length / 2), data.length - 1];
  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(((e.clientX - r.left) / r.width) * (data.length - 1)))));
  };
  const gid = `g-${title.replace(/\W/g, "")}`;
  const h = hover !== null ? data[hover] : null;

  return (
    <figure className="card">
      <figcaption className="mb-3 flex items-baseline justify-between gap-3">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-muted">
          {cumulative ? <><strong className="text-lg text-ink tabular-nums">{data.at(-1)?.n ?? 0}</strong> {t("admin.cumulTotal")}</> : <><strong className="text-lg text-ink tabular-nums">{sum}</strong> {t("admin.onPeriod")}</>}
        </span>
      </figcaption>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden className="h-44 w-full touch-pan-y overflow-visible" onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((r) => <line key={r} x1={0} x2={W} y1={top + plotH * (1 - r)} y2={top + plotH * (1 - r)} stroke="var(--grid)" strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
          <path d={area} fill={`url(#${gid})`} />
          <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={top} y2={top + plotH} stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
        </svg>
        {h && hover !== null && (
          <>
            {/* point et infobulle en HTML : restent ronds et nets quelle que soit la largeur du graphique */}
            <span aria-hidden className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(h.n) / H) * 100}%`, background: color }} />
            <span role="status" className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-lg" style={{ left: `${Math.min(88, Math.max(12, (x(hover) / W) * 100))}%`, top: `${Math.max(30, (y(h.n) / H) * 100)}%`, transform: "translate(-50%, calc(-100% - 10px))" }}>
              <span className="text-muted">{h.label}</span> · <strong className="tabular-nums text-ink">{h.n}</strong>
            </span>
          </>
        )}
      </div>
      <div aria-hidden className="mt-2 flex justify-between gap-2 text-xs text-muted">{ticks.map((i) => <span key={i}>{data[i]?.label}</span>)}</div>
      <table className="sr-only">
        <caption>{`${title} · ${t("admin.chartTable")}`}</caption>
        <thead><tr><th scope="col">{t("admin.date")}</th><th scope="col">{t("admin.count")}</th></tr></thead>
        <tbody>{data.map((d, i) => <tr key={i}><td>{d.label}</td><td>{d.n}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
