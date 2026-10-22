import { Banknote, Layers, PackageCheck, PiggyBank } from "lucide-react";
import { cutList, fmt, meters } from "@/lib/calc";
import type { T } from "@/lib/i18n";
import { FINISHES, type Quote } from "@/lib/model";
import type { Procurement } from "@/lib/procure";
import { totals } from "@/lib/totals";

// Budget d'un devis en une page : besoin de profilés et de vitrage, coût d'achat, prix de vente, marge, TVA, acompte, et la part de chaque profilé dans le budget.
export default function Budget({ quote, plan, t }: { quote: Quote; plan: Procurement; t: T }) {
  const cur = t("common.currency");
  const { gross, discount, ht, tva, ttc } = totals(quote);
  const margin = ht - plan.totalCost;
  const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
  const deposit = Math.round((ttc * quote.terms.deposit) / 100);

  // vitrage : nombre de vitres et surface, ouvrage par ouvrage (× quantité)
  let panes = 0;
  let area = 0;
  for (const l of quote.lines) {
    for (const g of cutList(l).glass) {
      panes += g.qty * l.qty;
      area += (g.w * g.h * g.qty * l.qty) / 1e6;
    }
  }
  const bought = plan.totalLen;
  const row = (label: string, value: string, strong = false, tone = "") => (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-bold" : "font-medium"} ${tone}`}>{value}</dd>
    </div>
  );

  return (
    <section className="space-y-4" aria-labelledby="h-budget">
      <h2 id="h-budget" className="text-lg font-semibold">{t("budget.title")}</h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <article className="card !p-4">
          <h3 className="mb-2 flex items-center gap-2 font-semibold"><Banknote size={18} aria-hidden className="text-primary" />{t("budget.sale")}</h3>
          <dl className="divide-y divide-line">
            {row(t("budget.gross"), `${fmt(gross)} ${cur}`)}
            {discount > 0 && row(`${t("editor.discount")} ${quote.discount} %`, `− ${fmt(discount)} ${cur}`)}
            {row(t("editor.totalHt"), `${fmt(ht)} ${cur}`, true)}
            {quote.terms.tva > 0 && row(`${t("editor.totalTva")} ${quote.terms.tva} %`, `${fmt(tva)} ${cur}`)}
            {row(t("editor.totalTtc"), `${fmt(ttc)} ${cur}`, true)}
            {row(`${t("budget.deposit")} ${quote.terms.deposit} %`, `${fmt(deposit)} ${cur}`)}
          </dl>
        </article>

        <article className="card !p-4">
          <h3 className="mb-2 flex items-center gap-2 font-semibold"><PiggyBank size={18} aria-hidden className="text-primary" />{t("budget.margin")}</h3>
          <dl className="divide-y divide-line">
            {row(t("budget.profileCost"), `${fmt(plan.totalCost)} ${cur}`)}
            {row(t("budget.marginAmount"), `${fmt(margin)} ${cur}`, true, margin < 0 ? "text-danger" : "text-ok")}
            {row(t("budget.marginPct"), `${pct(margin, ht)} %`, true, margin < 0 ? "text-danger" : "text-ok")}
            {row(t("budget.costShare"), `${pct(plan.totalCost, ht)} %`)}
            {row(t("budget.perM2"), `${fmt(area ? Math.round(ht / area) : 0)} ${cur}`)}
          </dl>
          <p className="mt-2 text-xs text-muted">{t("budget.marginNote")}</p>
        </article>

        <article className="card !p-4">
          <h3 className="mb-2 flex items-center gap-2 font-semibold"><PackageCheck size={18} aria-hidden className="text-primary" />{t("budget.need")}</h3>
          <dl className="divide-y divide-line">
            {row(t("needsPage.totalBars"), String(plan.bars), true)}
            {row(t("budget.bought"), meters(bought))}
            {row(t("needs.used"), meters(plan.usedLen))}
            {row(t("needs.waste"), `${meters(plan.wasteLen)} · ${plan.wastePct} %`, false, plan.wastePct > 40 ? "text-warn" : "")}
            {row(t("budget.glass"), `${panes} · ${fmt(Math.round(area * 100) / 100)} m²`)}
          </dl>
        </article>
      </div>

      <div className="card !p-0 overflow-hidden">
        <h3 className="flex items-center gap-2 border-b border-line px-4 py-3 font-semibold"><Layers size={18} aria-hidden className="text-primary" />{t("budget.byProfile")}</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[38rem] text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2 font-semibold">{t("budget.profile")}</th>
                <th className="px-2 py-2 text-right font-semibold">{t("needsPage.totalBars")}</th>
                <th className="px-2 py-2 text-right font-semibold">{t("needs.used")}</th>
                <th className="px-2 py-2 text-right font-semibold">{t("needs.waste")}</th>
                <th className="px-2 py-2 text-right font-semibold">{t("needsPage.cost")}</th>
                <th className="px-4 py-2 text-right font-semibold">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...plan.groups].sort((a, b) => b.cost - a.cost).map((g) => (
                <tr key={g.key}>
                  <td className="px-4 py-2.5">
                    <span aria-hidden className="mr-2 inline-block size-3.5 rounded-full border border-black/20 align-middle" style={{ background: FINISHES.find((f) => f.id === g.finish)?.hex }} />
                    {t(g.profile)} <span className="text-xs text-muted">{t(`range.${g.range as "europeen" | "asiatique"}`)} · {t(`finish.${g.finish as "blanc"}`)}</span>
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{g.bars.length}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{meters(g.usedLen)}</td>
                  <td className={`px-2 py-2.5 text-right tabular-nums ${g.wastePct > 40 ? "text-warn" : ""}`}>{g.wastePct} %</td>
                  <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{fmt(g.cost)} {cur}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">{pct(g.cost, plan.totalCost)} %</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-line bg-surface-2 font-bold">
              <tr>
                <td className="px-4 py-2.5">{t("budget.total")}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{plan.bars}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{meters(plan.usedLen)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{plan.wastePct} %</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{fmt(plan.totalCost)} {cur}</td>
                <td className="px-4 py-2.5 text-right">100 %</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}
