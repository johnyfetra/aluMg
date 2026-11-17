"use client";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { FinishSwatch } from "../Swatch";
import { fmt, meters } from "@/lib/calc";
import type { T } from "@/lib/i18n";
import type { FinishId, Line } from "@/lib/model";
import type { GroupPlan } from "@/lib/procure";

const lineLink = (id: string, lineId: string, n: number) => (
  <Link key={n} href={`/devis/${id}/profils/${lineId}`} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-xs font-semibold text-primary hover:underline">
    #{n}
  </Link>
);

// Un profilé dans une série et une couleur : barres à acheter aux longueurs et prix des fournisseurs, pièces coupées, plan de coupe barre par barre.
// Sans devis enregistré (`quoteId` absent), les numéros d'ouvrage ne sont pas des liens.
export default function GroupCard({ g, quoteId, lines, t }: { g: GroupPlan; quoteId?: string; lines: Line[]; t: T }) {
  const cur = t("common.currency");
  return (
    <article className="card !p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold">
          <FinishSwatch id={g.finish as FinishId} size={16} />
          {t(g.profile)}
          <span className="text-xs font-normal text-muted">
            {t(`range.${g.range as "europeen" | "asiatique"}`)} · {t(`finish.${g.finish as "blanc"}`)}
          </span>
        </h3>
        <span className="text-lg font-bold">
          {fmt(g.cost)} {cur}
        </span>
      </header>

      {g.unavailable && (
        <p role="note" className="mb-2 flex items-center gap-2 text-sm font-medium text-warn">
          <TriangleAlert size={16} aria-hidden />
          {t("needsPage.unavailable")}
        </p>
      )}
      {g.noOffer ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {t("needsPage.noOffer")} <Link href="/fournisseurs" className="underline">{t("needsPage.configure")}</Link>
        </p>
      ) : (
        <ul className="mb-3 space-y-1 text-sm">
          {g.purchase.map((p) => (
            <li key={`${p.length}|${p.price}`} className="flex justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2">
              <span className="font-semibold">
                {p.count} × {meters(p.length)}
              </span>
              <span className="text-muted">
                {fmt(p.price)} {cur} / {t("needsPage.unitBar")}
              </span>
            </li>
          ))}
        </ul>
      )}
      {g.tooLong.length > 0 && (
        <p role="alert" className="mb-2 flex items-center gap-2 text-sm font-medium text-danger">
          <TriangleAlert size={16} aria-hidden />
          {t("needsPage.tooLong")} {[...new Set(g.tooLong)].join(", ")} mm
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{t("needsPage.ouvrages")}</span>
        {g.lines.map((n) => (quoteId ? lineLink(quoteId, lines[n - 1].id, n) : <span key={n} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-xs font-semibold">#{n}</span>))}
      </div>

      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted">
          <tr>
            <th className="pb-1 font-medium">{t("needs.element")}</th>
            <th className="pb-1 font-medium">{t("needs.ouvrages")}</th>
            <th className="pb-1 text-right font-medium">{t("needs.pieces")}</th>
          </tr>
        </thead>
        <tbody>
          {g.elements.map((e) => (
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
          <dd className="font-bold">{g.bars.length}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{t("needs.used")}</dt>
          <dd className="font-bold">{meters(g.usedLen)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{t("needs.waste")}</dt>
          <dd className={`font-bold ${g.wastePct > 40 ? "text-warn" : ""}`}>
            {meters(g.wasteLen)} · {g.wastePct} %
          </dd>
        </div>
      </dl>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-medium text-primary">{t("needsPage.cuttingPlan")}</summary>
        <ol className="mt-2 space-y-1">
          {g.bars.map((b, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-2">
              <span className="w-28 shrink-0 text-muted">
                {t("needs.bar")} {i + 1} · {meters(b.length)}
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
