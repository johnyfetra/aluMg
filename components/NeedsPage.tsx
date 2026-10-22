"use client";
import { ArrowLeft, ArrowRight, Box, Coins, PackageCheck, Percent, Scissors, Settings2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";
import Budget from "./Budget";
import { MarketSim } from "./MarketSim";
import Viewer3DLoader from "./Viewer3DLoader";
import { allPieces, fmt, lineTotal, meters } from "@/lib/calc";
import { useQuotes, useSettings } from "@/lib/client";
import { lineDetails, lineTitle } from "@/lib/describe";
import { drawingSvg } from "@/lib/drawing";
import { type T, useI18n } from "@/lib/i18n";
import { FINISHES, type Line, type Quote, type Settings } from "@/lib/model";
import { type GroupPlan, type Plan, initSim, procure, simulate } from "@/lib/procure";
import { totals } from "@/lib/totals";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Kpi({ label, value, hint, Icon, tone }: { label: string; value: ReactNode; hint?: string; Icon: typeof Coins; tone?: string }) {
  return (
    <div className="card flex items-center gap-4 !p-4">
      <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className={`text-lg font-bold leading-tight ${tone ?? ""}`}>{value}</dd>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}

const dot = (finish: string) => <span aria-hidden className="inline-block size-3.5 rounded-full border border-black/20 align-middle" style={{ background: FINISHES.find((f) => f.id === finish)?.hex }} />;
const lineLink = (id: string, lineId: string, n: number) => (
  <Link key={n} href={`/devis/${id}/profils/${lineId}`} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-xs font-semibold text-primary hover:underline">
    #{n}
  </Link>
);

export default function NeedsPage({ id, lineId }: { id: string; lineId?: string }) {
  const { t } = useI18n();
  const { quotes, loading } = useQuotes();
  const { settings } = useSettings();
  if (loading || !quotes || !settings) return null;
  const quote = quotes.find((q) => q.id === id);
  const idx = lineId ? quote?.lines.findIndex((l) => l.id === lineId) ?? -1 : -1;
  if (!quote || (lineId && idx < 0)) {
    return (
      <p className="card">
        {t("needsPage.notFound")}{" "}
        <Link href="/devis" className="text-primary underline">
          {t("common.back")}
        </Link>
      </p>
    );
  }
  const plan = procure(allPieces(quote.lines), settings.market, settings.kerf);
  return lineId ? <LineView quote={quote} idx={idx} plan={plan} t={t} /> : <QuoteView quote={quote} base={simulate(quote.lines, initSim(settings.market), settings.kerf)} settings={settings} t={t} />;
}

// ---------- Vue du devis : tout ce qu'il faut acheter ----------
function QuoteView({ quote, base, settings, t }: { quote: Quote; base: Plan; settings: Settings; t: T }) {
  const { save } = useSettings();
  const [sim, setSim] = useState(() => initSim(settings.market));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // Besoin et coût sous les hypothèses de la simulation ; `base` = ce que donne le marché enregistré.
  const plan = useMemo(() => simulate(quote.lines, sim, settings.kerf), [quote.lines, sim, settings.kerf]);
  const sale = totals(quote).ht;
  const margin = sale - plan.allCost;
  const cur = t("common.currency");
  const diff = (n: number, unit = "") => (n === 0 ? undefined : `${n > 0 ? "+" : "−"}${fmt(Math.abs(n))}${unit}`);
  const applySim = async () => {
    // les prix simulés (variation générale comprise) deviennent les prix du marché
    const k = 1 + sim.pct / 100;
    const offers = Object.fromEntries(Object.entries(sim.market.offers).map(([p, os]) => [p, os.map((o) => ({ ...o, price: Math.round(o.price * k) }))]));
    const market = { ...sim.market, offers };
    try {
      await save({ ...settings, market });
      setSim(initSim(market));
      setMsg({ ok: true, text: t("sim.applied") });
    } catch {
      setMsg({ ok: false, text: t("common.error") });
    }
  };
  return (
    <div className="space-y-6">
      <Link href={`/devis/${quote.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        <ArrowLeft size={16} aria-hidden />
        {t("needsPage.back")}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          {t("needsPage.title")} — {quote.number}
        </h1>
        <Link href="/reglages/profils" className="btn-secondary">
          <Settings2 size={16} aria-hidden />
          {t("needsPage.configure")}
        </Link>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label={t("needsPage.totalBars")} value={plan.bars} hint={diff(plan.bars - base.bars)} Icon={PackageCheck} />
        <Kpi label={t("needsPage.allCost")} value={`${fmt(plan.allCost)} ${cur}`} hint={diff(plan.allCost - base.allCost, ` ${cur}`)} Icon={Coins} />
        <Kpi label={t("editor.totalHt")} value={`${fmt(sale)} ${cur}`} Icon={Box} />
        <Kpi label={t("needsPage.margin")} value={`${fmt(margin)} ${cur}`} hint={sale ? `${Math.round((margin / sale) * 100)} % ${t("needsPage.vsSale")}` : undefined} Icon={Percent} tone={margin < 0 ? "text-danger" : "text-ok"} />
        <Kpi label={t("needs.totalWaste")} value={`${meters(plan.wasteLen)} (${plan.wastePct} %)`} Icon={Scissors} tone={plan.wastePct > 40 ? "text-warn" : undefined} />
      </dl>

      <MarketSim sim={sim} setSim={setSim} lines={quote.lines} kerf={settings.kerf} baseCost={base.allCost} cost={plan.allCost} saved={settings.market} onSave={applySim} t={t} />
      <p role="status" className={`text-sm font-medium ${msg?.ok ? "text-ok" : "text-danger"}`}>{msg?.text}</p>

      <Budget quote={quote} plan={plan} t={t} />

      <section className="card !p-0 overflow-hidden" aria-labelledby="h-lines">
        <h2 id="h-lines" className="border-b border-line px-4 py-3 font-semibold">
          {t("needsPage.perLineCost")}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2 font-semibold">{t("editor.line")}</th>
                <th className="px-4 py-2 text-right font-semibold">{t("needsPage.totalLen")}</th>
                <th className="px-4 py-2 text-right font-semibold">{t("needsPage.share")}</th>
                <th className="px-4 py-2 text-right font-semibold">{t("needsPage.sale")}</th>
                <th className="px-4 py-2 text-right font-semibold">%</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {quote.lines.map((l, i) => {
                const c = plan.byLine[i + 1];
                const s = lineTotal(l);
                return (
                  <tr key={l.id} className="hover:bg-surface-2/60">
                    <td className="px-4 py-3">
                      <span className="mr-2 font-semibold text-muted">#{i + 1}</span>
                      {cap(lineTitle(l, t))}
                      <span className="ml-2 text-xs text-muted">
                        {l.width} × {l.height} mm · ×{l.qty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{meters(c?.usedLen ?? 0)}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {fmt(c?.cost ?? 0)} {cur}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {fmt(s)} {cur}
                    </td>
                    <td className="px-4 py-3 text-right text-muted">{s ? Math.round(((c?.cost ?? 0) / s) * 100) : 0} %</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/devis/${quote.id}/profils/${l.id}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                        {t("needsPage.detail")}
                        <ArrowRight size={14} aria-hidden />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="h-buy">
        <h2 id="h-buy" className="text-lg font-semibold">
          {t("needsPage.purchase")}
        </h2>
        <div className="grid gap-4 xl:grid-cols-2">
          {plan.groups.map((g) => (
            <GroupCard key={g.key} g={g} quoteId={quote.id} lines={quote.lines} t={t} />
          ))}
        </div>
      </section>
      <p className="max-w-3xl text-xs text-muted">{t("needsPage.algo")}</p>
    </div>
  );
}

function GroupCard({ g, quoteId, lines, t }: { g: GroupPlan; quoteId: string; lines: Line[]; t: T }) {
  const cur = t("common.currency");
  return (
    <article className="card !p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold">
          {dot(g.finish)}
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
          {t("needsPage.noOffer")} <Link href="/reglages/profils" className="underline">{t("needsPage.configure")}</Link>
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
        {g.lines.map((n) => lineLink(quoteId, lines[n - 1].id, n))}
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

// ---------- Vue d'un ouvrage : ses profilés, qui les partage, combien ils coûtent ----------
function LineView({ quote, idx, plan, t }: { quote: Quote; idx: number; plan: ReturnType<typeof procure>; t: T }) {
  const l = quote.lines[idx];
  const n = idx + 1;
  const [hl, setHl] = useState<string | null>(null);
  const [view, setView] = useState<"3d" | "2d">("3d");
  const groups = plan.groups.filter((g) => g.lines.includes(n));
  const mine = plan.byLine[n] ?? { cost: 0, usedLen: 0 };
  const sale = lineTotal(l);
  const cur = t("common.currency");
  const sk = drawingSvg(l, l.id, 520, 360);
  const prev = quote.lines[idx - 1];
  const next = quote.lines[idx + 1];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/devis/${quote.id}/profils`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <ArrowLeft size={16} aria-hidden />
          {t("needsPage.allLines")}
        </Link>
        <nav className="flex gap-2" aria-label={t("editor.lines")}>
          {prev && (
            <Link href={`/devis/${quote.id}/profils/${prev.id}`} className="btn-secondary !min-h-9">
              <ArrowLeft size={14} aria-hidden /> #{idx}
            </Link>
          )}
          {next && (
            <Link href={`/devis/${quote.id}/profils/${next.id}`} className="btn-secondary !min-h-9">
              #{idx + 2} <ArrowRight size={14} aria-hidden />
            </Link>
          )}
        </nav>
      </div>

      <div>
        <h1 className="text-2xl font-bold">
          {t("editor.line")} {n} — {cap(lineTitle(l, t))}
        </h1>
        <p className="text-muted">
          {quote.number} · {l.width} × {l.height} mm · ×{l.qty}
        </p>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section className="card space-y-3" aria-labelledby="h-view">
          <div className="flex items-center justify-between gap-2">
            <h2 id="h-view" className="font-semibold">
              {view === "3d" ? t("viewer.title") : t("editor.preview")}
            </h2>
            <div role="group" aria-label={t("viewer.title")} className="flex gap-1 rounded-full border border-line p-0.5">
              {(["3d", "2d"] as const).map((v) => (
                <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`min-h-9 rounded-full px-3 text-sm font-medium ${view === v ? "bg-primary text-on-primary" : "text-muted hover:text-ink"}`}>
                  {t(v === "3d" ? "viewer.show3d" : "viewer.show2d")}
                </button>
              ))}
            </div>
          </div>
          {view === "3d" ? (
            <Viewer3DLoader line={l} highlight={hl} />
          ) : (
            <div role="img" aria-label={lineTitle(l, t)} className="flex justify-center rounded-xl bg-white p-3" dangerouslySetInnerHTML={{ __html: sk.svg }} />
          )}
          <ul className="space-y-0.5 text-sm text-muted">
            {lineDetails(l, t).map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </section>

        <div className="space-y-4">
          <dl className="grid gap-3 sm:grid-cols-3">
            <Kpi label={t("needsPage.share")} value={`${fmt(mine.cost)} ${cur}`} Icon={Coins} />
            <Kpi label={t("needsPage.sale")} value={`${fmt(sale)} ${cur}`} Icon={Box} />
            <Kpi label={t("needsPage.margin")} value={`${fmt(sale - mine.cost)} ${cur}`} hint={sale ? `${Math.round(((sale - mine.cost) / sale) * 100)} % ${t("needsPage.vsSale")}` : undefined} Icon={Percent} tone={sale - mine.cost < 0 ? "text-danger" : "text-ok"} />
          </dl>
          <p className="text-xs text-muted">{t("needsPage.hoverHint")}</p>

          {groups.map((g) => {
            const s = g.share[n];
            const others = g.lines.filter((x) => x !== n);
            const mineEls = g.elements.filter((e) => e.lines.includes(n));
            const longest = Math.max(0, ...g.purchase.map((p) => p.length));
            return (
              <article key={g.key} className="card !p-4">
                <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 font-semibold">
                    {dot(g.finish)}
                    {t(g.profile)}
                  </h3>
                  <span className="font-bold">
                    {fmt(s?.cost ?? 0)} {cur}
                  </span>
                </header>
                <table className="w-full text-sm">
                  <tbody>
                    {mineEls.map((e) => (
                      <tr key={`${e.element}|${e.len}`} tabIndex={0} onMouseEnter={() => setHl(e.element)} onMouseLeave={() => setHl(null)} onFocus={() => setHl(e.element)} onBlur={() => setHl(null)} className="cursor-default border-t border-line outline-offset-[-2px] first:border-0 hover:bg-surface-2 focus-visible:bg-surface-2">
                        <td className="py-1.5 pl-1">{t(e.element)}</td>
                        <td className="py-1.5 text-right font-medium">
                          {e.qty} × {e.len} mm
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 text-sm">
                  <span>
                    <span className="text-muted">{t("needsPage.totalLen")} :</span> <strong>{meters(s?.usedLen ?? 0)}</strong>
                    {longest > 0 && (
                      <span className="text-muted">
                        {" "}
                        ≈ {((s?.usedLen ?? 0) / longest).toFixed(1).replace(".", ",")} {t("needsPage.equiv")}
                      </span>
                    )}
                  </span>
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted">{others.length ? t("needsPage.sharedWith") : ""}</span>
                  {others.length ? others.map((o) => lineLink(quote.id, quote.lines[o - 1].id, o)) : <span className="text-muted">{t("needsPage.alone")}</span>}
                </p>
              </article>
            );
          })}
          <p className="text-xs text-muted">
            <Link href={`/devis/${quote.id}/profils`} className="font-medium text-primary hover:underline">
              {t("needsPage.purchase")} →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
