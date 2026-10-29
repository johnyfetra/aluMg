"use client";
import { type ProfilePlan, allPieces, cutList, cuttingPlan, meters, planTotals } from "@/lib/calc";
import { type T } from "@/lib/i18n";
import type { Line } from "@/lib/model";

// Détail du besoin en profilés : par profilé (longueur de barre, éléments qui l'utilisent, coupes), plan de coupe barre par barre,
// et totaux (barres à acheter, longueur utilisée, perte). Les vitrages à commander sont listés dessous.
export default function ProfileNeeds({ lines, barLen, kerf, t }: { lines: Line[]; barLen: number; kerf: number; t: T }) {
  const plans = cuttingPlan(allPieces(lines), barLen, kerf);
  const tot = planTotals(plans);
  const glass = lines.flatMap((l, i) => cutList(l).glass.map((g) => ({ ...g, qty: g.qty * l.qty, line: i + 1, l })));
  const panels = lines.flatMap((l, i) => cutList(l).panels.map((g) => ({ ...g, qty: g.qty * l.qty, line: i + 1, l })));
  const area = glass.reduce((s, g) => s + (g.qty * g.w * g.h) / 1e6, 0);

  if (!plans.length) return <p className="card text-sm text-muted">{t("needs.empty")}</p>;

  const stats: [string, string, string?][] = [
    [t("needs.totalBars"), String(tot.bars)],
    [t("needs.totalLength"), meters(tot.totalLen)],
    [t("needs.totalUsed"), meters(tot.usedLen)],
    [t("needs.totalWaste"), `${meters(tot.wasteLen)} (${tot.wastePct} %)`, tot.wastePct > 40 ? "text-warn" : undefined],
    [t("needs.reusable"), meters(tot.reusableLen)],
    [t("needs.lostReal"), meters(tot.wasteLen - tot.reusableLen)],
  ];

  return (
    <section className="space-y-4" aria-labelledby="h-needs">
      <div>
        <h2 id="h-needs" className="text-lg font-semibold">
          {t("editor.materials")}
        </h2>
        <p className="text-xs text-muted">
          {t("editor.materialsHint")}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map(([k, v, cls]) => (
          <div key={k} className="card !p-3">
            <dt className="text-xs text-muted">{k}</dt>
            <dd className={`text-lg font-bold ${cls ?? ""}`}>{v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 xl:grid-cols-2">
        {plans.map((p) => (
          <ProfileCard key={p.profile} p={p} t={t} />
        ))}
      </div>

      {(glass.length > 0 || panels.length > 0) && (
        <div className="card">
          <h3 className="mb-2 font-semibold">{t("needs.glass")}</h3>
          <ul className="space-y-1 text-sm">
            {glass.map((g, i) => (
              <li key={`g${i}`} className="flex flex-wrap justify-between gap-2">
                <span>
                  <span className="text-muted">#{g.line}</span> {g.qty} × {g.w} × {g.h} mm
                </span>
                <span className="text-muted">
                  {t(`glass.${g.l.glassType}`)}, {t(`thickness.${g.l.thickness}`)}
                  {g.l.pattern !== "none" ? `, ${t(`pattern.${g.l.pattern}`)}` : ""}
                </span>
              </li>
            ))}
            {panels.map((g, i) => (
              <li key={`p${i}`} className="flex flex-wrap justify-between gap-2">
                <span>
                  <span className="text-muted">#{g.line}</span> {g.qty} × {g.w} × {g.h} mm
                </span>
                <span className="text-muted">{t("needs.panels")}</span>
              </li>
            ))}
          </ul>
          {glass.length > 0 && (
            <p className="mt-2 border-t border-line pt-2 text-sm font-semibold">
              {t("needs.glassArea")} : {area.toFixed(2).replace(".", ",")} m²
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function ProfileCard({ p, t }: { p: ProfilePlan; t: T }) {
  return (
    <article className="card !p-4">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">{t(p.profile)}</h3>
        <span className="text-xs text-muted">
          {t("needs.barLength")} {meters(p.barLen)}
        </span>
      </header>

      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted">
          <tr>
            <th className="pb-1 font-medium">{t("needs.element")}</th>
            <th className="pb-1 font-medium">{t("needs.ouvrages")}</th>
            <th className="pb-1 text-right font-medium">{t("needs.pieces")}</th>
          </tr>
        </thead>
        <tbody>
          {p.elements.map((e) => (
            <tr key={`${e.element}|${e.len}`} className="border-t border-line">
              <td className="py-1.5">{t(e.element)}</td>
              <td className="py-1.5 text-muted">{e.lines.map((n) => `#${n}`).join(" ")}</td>
              <td className="py-1.5 text-right font-medium">
                {e.qty} × {e.len} mm
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-surface-2 p-3 text-sm">
        <div>
          <dt className="text-xs text-muted">{t("needs.bars")}</dt>
          <dd className="font-bold">{p.bars.length}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{t("needs.used")}</dt>
          <dd className="font-bold">{meters(p.usedLen)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{t("needs.waste")}</dt>
          <dd className={`font-bold ${p.wastePct > 40 ? "text-warn" : ""}`}>
            {meters(p.wasteLen)} · {p.wastePct} %
          </dd>
        </div>
      </dl>

      {p.tooLong.length > 0 && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {t("needs.tooLong")} {[...new Set(p.tooLong)].join(", ")} mm
        </p>
      )}

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-medium text-primary">{t("needs.plan")}</summary>
        <ol className="mt-2 space-y-1">
          {p.bars.map((b, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-2">
              <span className="w-16 shrink-0 text-muted">
                {t("needs.bar")} {i + 1}
              </span>
              <span className="min-w-0 flex-1">{b.cuts.join(" + ")}</span>
              <span className="text-xs text-muted">
                {t("needs.left")} {b.left} mm
              </span>
            </li>
          ))}
        </ol>
      </details>
    </article>
  );
}
