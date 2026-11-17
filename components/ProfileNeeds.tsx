"use client";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import GroupCard from "./needs/GroupCard";
import { cutList, meters } from "@/lib/calc";
import { type T } from "@/lib/i18n";
import type { Line } from "@/lib/model";
import type { Procurement } from "@/lib/procure";

// Détail du besoin en profilés, aux longueurs et prix des fournisseurs : par profilé, série et couleur, barres à acheter et plan de coupe,
// et totaux (barres, longueur utilisée, perte). Les vitrages à commander sont listés dessous.
export default function ProfileNeeds({ lines, plan: tot, quoteId, t }: { lines: Line[]; plan: Procurement; quoteId?: string; t: T }) {
  const [open, setOpen] = useState(false); // replié au départ : l'essentiel d'abord, le détail à la demande
  const plans = tot.groups;
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

      {/* l'essentiel : barres à acheter et perte ; le reste s'ouvre à la demande */}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {(open ? stats : stats.filter((_, i) => i === 0 || i === 3)).map(([k, v, cls]) => (
          <div key={k} className="card !p-3">
            <dt className="text-xs text-muted">{k}</dt>
            <dd className={`text-lg font-bold ${cls ?? ""}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="btn-secondary !min-h-10 w-full sm:w-auto">
        {t(open ? "needs.hideDetail" : "needs.showDetail")}
        <ChevronDown size={16} aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
      <div className="grid gap-4 xl:grid-cols-2">
        {plans.map((p) => (
          <GroupCard key={p.key} g={p} quoteId={quoteId} lines={lines} t={t} />
        ))}
      </div>
      )}

      {open && (glass.length > 0 || panels.length > 0) && (
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
