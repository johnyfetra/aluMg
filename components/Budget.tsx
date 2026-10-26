import { Banknote, Layers, PackageCheck, PiggyBank } from "lucide-react";
import { fmt, meters } from "@/lib/calc";
import { laborTotal } from "@/lib/costing";
import type { T } from "@/lib/i18n";
import { ACCESSORIES, FINISHES, GLASSES, type Quote, type Settings } from "@/lib/model";
import type { Plan } from "@/lib/procure";
import { totals } from "@/lib/totals";

// Budget d'un devis en une page : besoin de profilés et de vitrage, coût d'achat, prix de vente, marge, TVA, acompte, et la part de chaque profilé dans le budget.
export default function Budget({ quote, plan, settings, t }: { quote: Quote; plan: Plan; settings: Settings; t: T }) {
  const cur = t("common.currency");
  const { gross, discount, ht, tva, ttc } = totals(quote);
  const labor = laborTotal(quote.lines, settings);
  const overhead = Math.round(((plan.allCost + labor) * settings.overheadPct) / 100);
  const totalCost = plan.allCost + labor + overhead;
  const margin = ht - totalCost;
  const area = plan.glassArea;
  const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
  const deposit = Math.round((ttc * quote.terms.deposit) / 100);

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
            {row(t("budget.accessories"), `${fmt(plan.accCost)} ${cur}`)}
            {row(t("budget.glassCost"), `${fmt(plan.glassCost)} ${cur}`)}
            {row(t("budget.labor"), `${fmt(labor)} ${cur}`)}
            {row(`${t("budget.overhead")} ${settings.overheadPct} %`, `${fmt(overhead)} ${cur}`)}
            {row(t("budget.totalCost"), `${fmt(totalCost)} ${cur}`, true)}
            {row(t("budget.marginAmount"), `${fmt(margin)} ${cur}`, true, margin < 0 ? "text-danger" : "text-ok")}
            {row(t("budget.marginPct"), `${pct(margin, ht)} %`, true, margin < 0 ? "text-danger" : "text-ok")}
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
            {row(t("budget.glass"), `${fmt(Math.round(area * 100) / 100)} m²`)}
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
                <th className="px-2 py-2 font-semibold">{t("budget.buy")}</th>
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
                  <td className="px-2 py-2.5 tabular-nums">{g.noOffer ? "—" : g.purchase.map((p) => `${p.count} × ${meters(p.length)}`).join(" + ")}</td>
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
                <td className="px-2 py-2.5 tabular-nums">{plan.bars}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{meters(plan.usedLen)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{plan.wastePct} %</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{fmt(plan.totalCost)} {cur}</td>
                <td className="px-4 py-2.5 text-right">100 %</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card !p-0 overflow-hidden">
          <h3 className="border-b border-line px-4 py-3 font-semibold">{t("budget.accTable")}</h3>
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-2 font-semibold">{t("budget.accessories")}</th><th className="px-2 py-2 text-right font-semibold">{t("budget.qty")}</th><th className="px-2 py-2 text-right font-semibold">{t("budget.unitPrice")}</th><th className="px-4 py-2 text-right font-semibold">{t("budget.total")}</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {plan.acc.map((a) => (
                <tr key={a.key}>
                  <td className="px-4 py-2.5">{t(a.key)}{ACCESSORIES.find((x) => x.key === a.key)?.unit === "ml" && <span className="text-xs text-muted"> ({t("unit.ml")})</span>}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{fmt(a.qty)}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-muted">{fmt(a.price)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{fmt(a.cost)} {cur}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-line bg-surface-2 font-bold">
              <tr><td className="px-4 py-2.5" colSpan={3}>{t("budget.total")}</td><td className="px-4 py-2.5 text-right tabular-nums">{fmt(plan.accCost)} {cur}</td></tr>
            </tfoot>
          </table>
        </div>
        <div className="card !p-0 overflow-hidden">
          <h3 className="border-b border-line px-4 py-3 font-semibold">{t("budget.glassTable")}</h3>
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-2 font-semibold">{t("budget.glass")}</th><th className="px-2 py-2 text-right font-semibold">{t("budget.area")}</th><th className="px-2 py-2 text-right font-semibold">{t("cat.unit.m2")}</th><th className="px-4 py-2 text-right font-semibold">{t("budget.total")}</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {plan.glass.map((g) => (
                <tr key={g.id}>
                  <td className="px-4 py-2.5">{t(GLASSES.find((x) => x.id === g.id)?.label ?? "glass.clair")}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{fmt(g.area)} m²</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-muted">{fmt(g.price)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{fmt(g.cost)} {cur}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-line bg-surface-2 font-bold">
              <tr><td className="px-4 py-2.5" colSpan={3}>{t("budget.total")}</td><td className="px-4 py-2.5 text-right tabular-nums">{fmt(plan.glassCost)} {cur}</td></tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}
