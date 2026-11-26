"use client";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { fmt, meters, REUSE_MIN } from "@/lib/calc";
import { useQuoteCatalog, useQuotes, useSettings } from "@/lib/client";
import { lineTitle } from "@/lib/describe";
import { DATE_LOCALE, type T, useI18n } from "@/lib/i18n";
import { ACCESSORIES, GLASSES, type Quote, type Settings } from "@/lib/model";
import { type Plan, initSim, simulate } from "@/lib/procure";
import { activeLines } from "@/lib/totals";

// Documents d'atelier d'un devis, imprimables : le bon de commande au fournisseur (barres, accessoires, verre, panneaux)
// et la fiche de coupe (chaque barre, ses coupes dans l'ordre, la chute à garder). Seuls les ouvrages retenus pour le chantier comptent.
type Tab = "order" | "cuts";

export default function Workshop({ id }: { id: string }) {
  const { t } = useI18n();
  const { quotes, loading } = useQuotes();
  const { settings } = useSettings();
  const catalog = useQuoteCatalog(id);
  if (loading || !quotes || !settings || catalog.loading) return null;
  const quote = quotes.find((q) => q.id === id);
  if (!quote) {
    return (
      <p className="card">
        {t("needsPage.notFound")} <Link href="/devis" className="text-primary underline">{t("common.back")}</Link>
      </p>
    );
  }
  return <WorkshopView quote={quote} settings={settings} market={catalog.market ?? settings.market} backHref={`/devis/${quote.id}/profils`} />;
}

// Bon de commande et fiche de coupe d'un devis déjà chargé (site, et application locale qui lit ses devis dans le téléphone).
export function WorkshopView({ quote, settings, market, backHref }: { quote: Quote; settings: Settings; market: Settings["market"]; backHref: string }) {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<Tab>("order");
  const plan = simulate(activeLines(quote), initSim(market), settings.kerf);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={backHref} className="btn-secondary !min-h-10">
            <ArrowLeft size={16} aria-hidden />
            {t("common.back")}
          </Link>
          <div role="group" aria-label={t("ws.title")} className="flex gap-1 rounded-full border border-line p-0.5">
            {(["order", "cuts"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={tab === v} onClick={() => setTab(v)} className={`min-h-9 rounded-full px-4 text-sm font-medium ${tab === v ? "bg-primary text-on-primary" : "text-muted hover:text-ink"}`}>
                {t(v === "order" ? "ws.order" : "ws.cuts")}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="btn-primary !min-h-10" onClick={() => window.print()}>
          <Printer size={16} aria-hidden />
          {t("preview.print")}
        </button>
      </div>
      <Sheet quote={quote} s={settings} supplier={market.supplier} title={t(tab === "order" ? "ws.orderTitle" : "ws.cutsTitle")} t={t} locale={locale}>
        {tab === "order" ? <Order plan={plan} t={t} /> : <Cuts plan={plan} quote={quote} kerf={settings.kerf} t={t} />}
      </Sheet>
    </div>
  );
}

// Feuille blanche, comme le devis : seule elle est imprimée (#quote-paper, voir globals.css).
function Sheet({ quote, s, supplier, title, t, locale, children }: { quote: Quote; s: Settings; supplier?: string; title: string; t: T; locale: keyof typeof DATE_LOCALE; children: React.ReactNode }) {
  const today = new Date().toLocaleDateString(DATE_LOCALE[locale], { day: "numeric", month: "long", year: "numeric" });
  return (
    <article id="quote-paper" aria-label={title} className="mx-auto w-full max-w-[56rem] space-y-6 rounded-xl bg-white p-6 text-slate-900 shadow-lg ring-1 ring-black/5 sm:p-10 print:max-w-none print:rounded-none print:p-0 print:shadow-none print:ring-0">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 pb-4" style={{ borderColor: s.accent }}>
        <div className="space-y-0.5">
          <p className="text-lg font-bold">{s.company || "-"}</p>
          {s.address && <p className="text-xs text-slate-500">{s.address}</p>}
          {(s.phone || s.email) && <p className="text-xs text-slate-500">{[s.phone, s.email].filter(Boolean).join("  ·  ")}</p>}
          {(s.nif || s.stat) && <p className="text-xs text-slate-500">{[s.nif && `NIF ${s.nif}`, s.stat && `STAT ${s.stat}`].filter(Boolean).join("  ·  ")}</p>}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold uppercase tracking-wide" style={{ color: s.accent }}>{title}</p>
          <p className="text-sm">{t("pdf.number")} <strong>{quote.number}</strong> · {today}</p>
          {supplier && <p className="text-sm">{t("ws.supplier")} : <strong>{supplier}</strong></p>}
          <p className="text-xs text-slate-500">{[quote.client.name, quote.project].filter(Boolean).join(" · ")}</p>
        </div>
      </header>
      {children}
    </article>
  );
}

const th = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600";
const td = "px-3 py-2 align-top";

function Order({ plan, t }: { plan: Plan; t: T }) {
  const cur = t("common.currency");
  const rows = plan.groups.flatMap((g) => g.purchase.map((p) => ({ g, p })));
  return (
    <div className="space-y-6 text-sm">
      <section className="space-y-2">
        <h2 className="font-bold">{t("ws.profiles")}</h2>
        <table className="w-full border-collapse">
          <thead className="bg-slate-100"><tr><th className={th}>{t("ws.profile")}</th><th className={th}>{t("ws.rangeFinish")}</th><th className={`${th} text-right`}>{t("ws.barLength")}</th><th className={`${th} text-right`}>{t("budget.qty")}</th><th className={`${th} text-right`}>{t("budget.unitPrice")}</th><th className={`${th} text-right`}>{t("budget.total")}</th></tr></thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map(({ g, p }) => (
              <tr key={`${g.key}|${p.length}|${p.price}`} className="break-inside-avoid">
                <td className={`${td} font-semibold`}>{t(g.profile)}</td>
                <td className={td}>{t(`range.${g.range as "europeen" | "asiatique"}`)} · {t(`finish.${g.finish as "blanc"}`)}</td>
                <td className={`${td} text-right tabular-nums`}>{meters(p.length)}</td>
                <td className={`${td} text-right font-bold tabular-nums`}>{p.count}</td>
                <td className={`${td} text-right tabular-nums text-slate-500`}>{fmt(p.price)}</td>
                <td className={`${td} text-right tabular-nums`}>{fmt(p.price * p.count)}</td>
              </tr>
            ))}
            {plan.groups.filter((g) => g.noOffer || g.tooLong.length).map((g) => (
              <tr key={`${g.key}|missing`}><td className={`${td} font-semibold text-red-700`} colSpan={6}>{t(g.profile)} : {t(g.noOffer ? "needsPage.noOffer" : "ws.tooLong")}</td></tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-300 font-bold"><tr><td className={td} colSpan={3}>{t("needsPage.totalBars")}</td><td className={`${td} text-right`}>{plan.bars}</td><td /><td className={`${td} text-right tabular-nums`}>{fmt(plan.totalCost)} {cur}</td></tr></tfoot>
        </table>
      </section>

      {plan.acc.length > 0 && (
        <section className="space-y-2 break-inside-avoid">
          <h2 className="font-bold">{t("budget.accessories")}</h2>
          <table className="w-full border-collapse">
            <thead className="bg-slate-100"><tr><th className={th}>{t("budget.accessories")}</th><th className={`${th} text-right`}>{t("budget.qty")}</th><th className={`${th} text-right`}>{t("budget.unitPrice")}</th><th className={`${th} text-right`}>{t("budget.total")}</th></tr></thead>
            <tbody className="divide-y divide-slate-200">
              {plan.acc.map((a) => (
                <tr key={a.key}><td className={td}>{t(a.key)}{ACCESSORIES.find((x) => x.key === a.key)?.unit === "ml" && ` (${t("unit.ml")})`}</td><td className={`${td} text-right font-bold tabular-nums`}>{fmt(a.qty)}</td><td className={`${td} text-right tabular-nums text-slate-500`}>{fmt(a.price)}</td><td className={`${td} text-right tabular-nums`}>{fmt(a.cost)}</td></tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-300 font-bold"><tr><td className={td} colSpan={3}>{t("budget.total")}</td><td className={`${td} text-right tabular-nums`}>{fmt(plan.accCost)} {cur}</td></tr></tfoot>
          </table>
        </section>
      )}

      {(plan.glass.length > 0 || plan.panelArea > 0) && (
        <section className="space-y-2 break-inside-avoid">
          <h2 className="font-bold">{t("ws.glassPanels")}</h2>
          <table className="w-full border-collapse">
            <thead className="bg-slate-100"><tr><th className={th}>{t("budget.glass")}</th><th className={`${th} text-right`}>{t("budget.area")}</th><th className={`${th} text-right`}>{t("cat.unit.m2")}</th><th className={`${th} text-right`}>{t("budget.total")}</th></tr></thead>
            <tbody className="divide-y divide-slate-200">
              {plan.glass.map((g) => (
                <tr key={g.id}><td className={td}>{t(GLASSES.find((x) => x.id === g.id)?.label ?? "glass.clair")}</td><td className={`${td} text-right font-bold tabular-nums`}>{fmt(g.area)} m²</td><td className={`${td} text-right tabular-nums text-slate-500`}>{fmt(g.price)}</td><td className={`${td} text-right tabular-nums`}>{fmt(g.cost)}</td></tr>
              ))}
              {plan.panelArea > 0 && <tr><td className={td}>{t("budget.panel")}</td><td className={`${td} text-right font-bold tabular-nums`}>{fmt(plan.panelArea)} m²</td><td /><td className={`${td} text-right tabular-nums`}>{fmt(plan.panelCost)}</td></tr>}
            </tbody>
          </table>
          <p className="text-xs text-slate-500">{t("ws.glassNote")}</p>
        </section>
      )}

      <p className="rounded-lg bg-slate-100 px-4 py-3 text-right text-base font-bold">{t("ws.orderTotal")} : {fmt(plan.allCost)} {cur}</p>
      <div className="grid gap-4 break-inside-avoid sm:grid-cols-2">
        {[t("ws.orderedBy"), t("ws.receivedBy")].map((x) => <div key={x} className="min-h-24 rounded-lg border border-slate-300 p-3 text-xs font-bold">{x}</div>)}
      </div>
    </div>
  );
}

function Cuts({ plan, quote, kerf, t }: { plan: Plan; quote: Quote; kerf: number; t: T }) {
  const active = activeLines(quote);
  // le plan numérote les ouvrages retenus (1, 2…) : on revient au numéro de l'ouvrage dans le devis
  const lineNo = (id: string) => quote.lines.findIndex((l) => l.id === id) + 1;
  const quoteNo = (n: number) => lineNo(active[n - 1].id);
  return (
    <div className="space-y-6 text-sm">
      <p className="text-xs text-slate-500">{t("ws.cutsNote").replace("{kerf}", String(kerf)).replace("{reuse}", String(REUSE_MIN))}</p>
      <section className="space-y-1 break-inside-avoid">
        <h2 className="font-bold">{t("ws.lines")}</h2>
        <ul className="grid gap-x-6 sm:grid-cols-2">
          {active.map((l) => <li key={l.id}>#{lineNo(l.id)} · {lineTitle(l, t)} · {l.width} × {l.height} mm · ×{l.qty}{l.room ? ` · ${l.room}` : ""}</li>)}
        </ul>
      </section>
      {plan.groups.map((g) => {
        // une longueur coupée → les éléments qui ont cette longueur (souvent un seul)
        const names = (len: number) => [...new Set(g.elements.filter((e) => e.len === len).map((e) => t(e.element)))].join(" / ");
        return (
          <section key={g.key} className="space-y-2 break-inside-avoid">
            <h2 className="font-bold">{t(g.profile)} <span className="font-normal text-slate-500">· {t(`range.${g.range as "europeen" | "asiatique"}`)} · {t(`finish.${g.finish as "blanc"}`)}</span></h2>
            <table className="w-full border-collapse">
              <thead className="bg-slate-100"><tr><th className={th}>{t("ws.piece")}</th><th className={`${th} text-right`}>{t("ws.length")}</th><th className={`${th} text-right`}>{t("budget.qty")}</th><th className={th}>{t("ws.forLines")}</th></tr></thead>
              <tbody className="divide-y divide-slate-200">
                {[...g.elements].sort((a, b) => b.len - a.len).map((e) => (
                  <tr key={`${e.element}|${e.len}`}><td className={td}>{t(e.element)}</td><td className={`${td} text-right font-bold tabular-nums`}>{e.len} mm</td><td className={`${td} text-right tabular-nums`}>{e.qty}</td><td className={td}>{e.lines.map((n) => `#${quoteNo(n)}`).join(" ")}</td></tr>
                ))}
              </tbody>
            </table>
            <ol className="space-y-1.5">
              {g.bars.map((b, i) => (
                <li key={i} className="flex flex-wrap items-center gap-1.5">
                  <span className="w-28 shrink-0 font-semibold">{t("ws.bar")} {i + 1} · {meters(b.length)}</span>
                  {b.cuts.map((c, j) => <span key={j} title={names(c)} className="rounded border border-slate-300 px-1.5 py-0.5 tabular-nums">{c}</span>)}
                  <span className={`ml-1 text-xs ${b.left >= REUSE_MIN ? "font-semibold text-emerald-700" : "text-slate-500"}`}>{t(b.left >= REUSE_MIN ? "ws.keep" : "ws.scrap").replace("{n}", String(b.left))}</span>
                  <span aria-hidden className="ml-auto size-4 rounded border border-slate-400" />
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
