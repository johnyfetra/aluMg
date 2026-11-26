"use client";
import { ArrowLeft, Eye, Plus, Ruler } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ServicesEditor from "@/components/ServicesEditor";
import { useToast } from "@/components/Toast";
import { LineCard } from "@/components/quote/LineCard";
import { DEFAULT_SIZE, newLine, price } from "@/components/quote/line";
import { Field } from "@/components/ui";
import { fmt, meters, normalize } from "@/lib/calc";
import { marginBasis, quoteMargin } from "@/lib/costing";
import { useI18n } from "@/lib/i18n";
import { type Line, lineMarks, lineSchema, type Quote, type Settings } from "@/lib/model";
import { initSim, simulate } from "@/lib/procure";
import { totals } from "@/lib/totals";
import { go, href } from "../lib/route";
import { useQuotes } from "../lib/store";

// Éditeur de devis de l'application : client, ouvrages (configuration, 2D/3D, prix et gain), prestations, totaux et gain total.
// Chaque modification est enregistrée dans le téléphone : pas de bouton « Enregistrer ».
export default function Editor({ quote, settings }: { quote: Quote; settings: Settings }) {
  const { t } = useI18n();
  const toast = useToast();
  const { save } = useQuotes();
  const [q, setQ] = useState(quote);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(quote.lines.length === 1 ? [quote.lines[0].id] : []));
  const first = useRef(true);
  useEffect(() => {
    if (first.current) return void (first.current = false);
    try {
      save(q);
    } catch {
      toast.error(t("toast.errorTitle"), t("app.storageFull"));
    }
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps -- enregistre à chaque changement du devis

  const setLine = (i: number, patch: Partial<Line>) =>
    setQ((cur) => ({
      ...cur,
      lines: cur.lines.map((l, j) => {
        if (j !== i) return l;
        const sizeReset = patch.category && patch.category !== l.category ? { width: DEFAULT_SIZE[patch.category][0], height: DEFAULT_SIZE[patch.category][1], leaves: patch.category === "cloison" ? 3 : 2 } : {};
        // une porte battante a un seul vantail (deux, c'est une porte à deux battants : choix du menuisier)
        const oneLeaf = (patch.opening ?? l.opening) === "ouvrant" && (patch.category ?? l.category) === "porte" && ("opening" in patch || "category" in patch) && !("leaves" in patch) ? { leaves: 1 } : {};
        const next = normalize({ ...l, ...sizeReset, ...oneLeaf, ...patch });
        // le prix suit la configuration, sauf si le menuisier vient de le fixer à la main
        return "unit" in patch ? next : { ...next, unit: price(next, settings) };
      }),
    }));
  const toggle = (id: string) =>
    setOpenIds((o) => {
      const n = new Set(o);
      if (!n.delete(id)) n.add(id);
      return n;
    });
  const duplicate = (i: number) => {
    const copy = { ...q.lines[i], id: crypto.randomUUID() };
    setQ((c) => ({ ...c, lines: [...c.lines.slice(0, i + 1), copy, ...c.lines.slice(i + 1)] }));
    setOpenIds((o) => new Set(o).add(copy.id));
  };
  const addLine = () => {
    const nl = newLine(settings);
    setQ((c) => ({ ...c, lines: [...c.lines, nl] }));
    setOpenIds((o) => new Set(o).add(nl.id));
  };
  const setClient = (patch: Partial<Quote["client"]>) => setQ((c) => ({ ...c, client: { ...c.client, ...patch } }));
  const num = (v: string) => Number(v) || 0;

  const valid = (l: Line) => lineSchema.safeParse(l).success;
  const live = q.lines.filter(valid);
  const sums = totals({ lines: live, terms: q.terms, discount: q.discount, services: q.services });
  const plan = simulate(live, initSim(settings.market), settings.kerf);
  const margin = live.length ? quoteMargin({ ...q, lines: live }, marginBasis(settings), plan.allCost) : null;
  const marks = lineMarks(q.lines);
  const cur = t("common.currency");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <a href={href("list")} className="btn-secondary !min-h-10 !px-2.5" aria-label={t("common.back")}>
          <ArrowLeft size={18} aria-hidden />
        </a>
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold">{q.number}</h1>
        <a href={href("apercu", { id: q.id })} className="btn-primary !min-h-10">
          <Eye size={16} aria-hidden />
          PDF
        </a>
      </div>

      <section className="card space-y-3 !p-4" aria-labelledby="h-client">
        <h2 id="h-client" className="text-base font-semibold">{t("editor.client")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field htmlFor="cn" label={t("editor.clientName")}>
            <input id="cn" className="input" autoComplete="name" maxLength={120} value={q.client.name} onChange={(e) => setClient({ name: e.target.value })} />
          </Field>
          <Field htmlFor="cp" label={t("editor.clientPhone")}>
            <input id="cp" className="input" type="tel" maxLength={40} value={q.client.phone} onChange={(e) => setClient({ phone: e.target.value })} />
          </Field>
          <Field htmlFor="pj" label={t("editor.project")}>
            <input id="pj" className="input" maxLength={200} value={q.project} onChange={(e) => setQ({ ...q, project: e.target.value })} />
          </Field>
          <Field htmlFor="ca" label={t("editor.clientAddress")}>
            <input id="ca" className="input" maxLength={200} value={q.client.address} onChange={(e) => setClient({ address: e.target.value })} />
          </Field>
          <Field htmlFor="dl" label={t("editor.delay")}>
            <input id="dl" className="input" maxLength={120} placeholder={t("editor.delayPlaceholder")} value={q.delay} onChange={(e) => setQ({ ...q, delay: e.target.value })} />
          </Field>
          <Field htmlFor="nt" label={t("editor.notes")}>
            <input id="nt" className="input" maxLength={600} value={q.notes} onChange={(e) => setQ({ ...q, notes: e.target.value })} />
          </Field>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="h-lines">
        <h2 id="h-lines" className="text-lg font-semibold">
          {t("editor.lines")} <span className="text-sm font-normal text-muted">({q.lines.length})</span>
        </h2>
        {q.lines.map((l, i) => (
          <LineCard
            key={l.id}
            l={l}
            i={i}
            t={t}
            settings={settings}
            valid={valid(l)}
            mark={marks[i]}
            open={openIds.has(l.id)}
            onToggle={() => toggle(l.id)}
            onChange={(p) => setLine(i, p)}
            onRemove={q.lines.length > 1 ? () => setQ({ ...q, lines: q.lines.filter((_, j) => j !== i) }) : undefined}
            onDuplicate={() => duplicate(i)}
            onNeeds={() => go("atelier", { id: q.id })}
            num={num}
            slides
            onSave={() => {
              toggle(l.id);
              toast.success(t("app.lineSaved"), `${marks[i]} · ${fmt(l.unit * l.qty)} ${cur}`);
              requestAnimationFrame(() => document.getElementById(`line-${l.id}`)?.scrollIntoView({ block: "start" }));
            }}
          />
        ))}
        <button type="button" className="btn-secondary w-full" onClick={addLine}>
          <Plus size={16} aria-hidden />
          {t("editor.addLine")}
        </button>
      </section>

      <ServicesEditor services={q.services ?? []} onChange={(services) => setQ((c) => ({ ...c, services }))} prices={settings.servicePrices} t={t} locked={false} />

      <section className="card space-y-2 !p-4" aria-label="Total">
        <p className="text-xs text-muted">{t(q.terms.tva > 0 ? "editor.totalTtc" : "editor.totalPlain")}</p>
        <p className="text-3xl font-bold tabular-nums text-primary">{fmt(sums.ttc)} <span className="text-base font-semibold">{cur}</span></p>
        <dl className="space-y-1.5 border-t border-line pt-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt><label htmlFor="q-disc" className="text-muted">{t("editor.discount")}</label></dt>
            <dd className="flex items-center gap-2 tabular-nums">
              {sums.discount > 0 && <span className="text-muted">− {fmt(sums.discount)}</span>}
              <input id="q-disc" type="number" inputMode="decimal" min={0} max={100} className="input !min-h-8 !w-20 !px-2 !py-0.5 text-right" value={q.discount || ""} placeholder="0 %" onChange={(e) => setQ({ ...q, discount: Math.min(100, Math.max(0, num(e.target.value))) })} />
            </dd>
          </div>
          <div>
            <label className="flex items-center gap-2 text-muted">
              <input type="checkbox" className="size-4" checked={q.terms.tva > 0} onChange={(e) => setQ({ ...q, terms: { ...q.terms, tva: e.target.checked ? settings.tva || 20 : 0 } })} />
              {t("editor.vat")}
            </label>
          </div>
          {q.terms.tva > 0 && <div className="flex justify-between"><dt className="text-muted">{t("editor.totalHt")}</dt><dd className="tabular-nums">{fmt(sums.ht)} {cur}</dd></div>}
          {q.terms.tva > 0 && <div className="flex justify-between"><dt className="text-muted">{t("editor.totalTva")} {q.terms.tva} %</dt><dd className="tabular-nums">{fmt(sums.tva)} {cur}</dd></div>}
        </dl>
      </section>

      {margin && (
        <section className="card space-y-1 !p-4 text-sm" aria-label={t("editor.marginLine")}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-semibold">{t("app.totalGain")}</p>
            <p className={`text-lg font-bold tabular-nums ${margin.margin < 0 ? "text-danger" : margin.pct < settings.minMarginPct ? "text-warn" : "text-ok"}`}>{fmt(margin.margin)} {cur}</p>
          </div>
          <p className="text-xs text-muted">{margin.pct} % · {margin.ofSale} {t("budget.ofSale")} · {t("app.purchases")} {fmt(plan.allCost)} {cur}</p>
          {margin.margin < 0 ? <p role="alert" className="text-xs font-medium text-danger">{t("editor.marginLoss")}</p> : margin.pct < settings.minMarginPct && <p className="text-xs font-medium text-warn">{t("editor.marginLow")}</p>}
        </section>
      )}

      <a href={href("atelier", { id: q.id })} className="card flex items-center justify-between gap-3 !p-4 text-sm">
        <span className="min-w-0">
          <span className="block font-semibold">{t("editor.materials")}</span>
          <span className="text-muted tabular-nums">{plan.bars} {t("needs.barsShort")} · {meters(plan.usedLen)} · {t("needs.wasteShort")} {plan.wastePct} %</span>
        </span>
        <span className="btn-secondary !min-h-9 shrink-0 !px-3 text-xs">
          <Ruler size={14} aria-hidden />
          {t("app.cutPlan")}
        </span>
      </a>
    </div>
  );
}
