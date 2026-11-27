"use client";
import { ArrowLeft, Check, ChevronDown, Eye, Plus, Ruler, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ServicesEditor from "@/components/ServicesEditor";
import { useToast } from "@/components/Toast";
import { LineCard } from "@/components/quote/LineCard";
import { Field } from "@/components/ui";
import { fmt, meters } from "@/lib/calc";
import { marginBasis, quoteMargin } from "@/lib/costing";
import { useI18n } from "@/lib/i18n";
import { type Line, lineMarks, lineSchema, type Quote, type Settings, type WorkType } from "@/lib/model";
import { initSim, simulate } from "@/lib/procure";
import { totals } from "@/lib/totals";
import { go, href } from "../lib/route";
import { useQuotes } from "../lib/store";
import WorkPicker, { lineOf, patchLine } from "@/components/quote/WorkPicker";

// Éditeur de devis de l'application : client, ouvrages (configuration, 2D/3D, prix et gain), prestations, totaux et gain total.
// Chaque modification est enregistrée dans le téléphone ; le bouton « Enregistrer » le confirme et ramène à la liste.
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

  const setLine = (i: number, patch: Partial<Line>) => setQ((cur) => ({ ...cur, lines: cur.lines.map((l, j) => (j === i ? patchLine(l, patch, settings) : l)) }));
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
  const [picking, setPicking] = useState(false);
  const addLine = (w: WorkType) => {
    const nl = lineOf(w, settings);
    setQ((c) => ({ ...c, lines: [...c.lines, nl] }));
    setOpenIds((o) => new Set(o).add(nl.id));
    setPicking(false);
    requestAnimationFrame(() => document.getElementById(`line-${nl.id}`)?.scrollIntoView({ block: "start" }));
  };
  // enregistrement automatique à chaque modification ; le bouton confirme et ramène à la liste
  const finish = () => {
    try {
      save(q);
      toast.success(t("app.quoteSaved"), `${q.number} · ${fmt(sums.ttc)} ${cur}`);
      go("list");
    } catch {
      toast.error(t("toast.errorTitle"), t("app.storageFull"));
    }
  };
  const setClient = (patch: Partial<Quote["client"]>) => setQ((c) => ({ ...c, client: { ...c.client, ...patch } }));
  const [clientOpen, setClientOpen] = useState(false);
  const [more, setMore] = useState(!!(quote.project || quote.delay || quote.notes));
  // action en attente du nom du client (PDF, enregistrer, quitter) ; `skip` : on peut la faire sans nom
  const [ask, setAsk] = useState<{ run: () => void; skip: boolean } | null>(null);
  const needClient = (run: () => void, skip = false) => {
    if (q.client.name.trim()) return run();
    setClientOpen(false); // mêmes champs dans la fenêtre : un seul exemplaire à l'écran
    setAsk({ run, skip });
  };
  const clientFields = (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field htmlFor="cn" label={t("editor.clientName")} required>
        <input id="cn" className="input" autoComplete="name" required maxLength={120} value={q.client.name} onChange={(e) => setClient({ name: e.target.value })} />
      </Field>
      <Field htmlFor="cp" label={t("editor.clientPhone")}>
        <input id="cp" className="input" type="tel" maxLength={40} value={q.client.phone} onChange={(e) => setClient({ phone: e.target.value })} />
      </Field>
      <Field htmlFor="ca" label={t("editor.clientAddress")}>
        <input id="ca" className="input" autoComplete="street-address" maxLength={200} value={q.client.address} onChange={(e) => setClient({ address: e.target.value })} />
      </Field>
    </div>
  );
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
        <button type="button" className="btn-secondary !min-h-10 !px-2.5" aria-label={t("common.back")} onClick={() => needClient(() => go("list"), true)}>
          <ArrowLeft size={18} aria-hidden />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold">{q.number}</h1>
        <button type="button" className="btn-secondary !min-h-10 !px-2.5" aria-label="PDF" title="PDF" onClick={() => needClient(() => go("apercu", { id: q.id }))}>
          <Eye size={18} aria-hidden />
        </button>
        <button type="button" className="btn-primary !min-h-10" onClick={() => needClient(finish, true)}>
          <Check size={16} aria-hidden />
          {t("common.save")}
        </button>
      </div>

      {/* fiche client repliée : seul le nom est obligatoire, il est demandé au moment du PDF ou de la sortie */}
      <section className="card !p-0" aria-labelledby="h-client">
        <button type="button" aria-expanded={clientOpen} onClick={() => setClientOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
          <UserRound size={18} aria-hidden className="shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span id="h-client" className="block text-xs text-muted">{t("editor.client")}</span>
            <span className={`block truncate font-semibold ${q.client.name ? "" : "text-primary"}`}>{q.client.name || t("editor.clientAdd")}</span>
          </span>
          <ChevronDown size={18} aria-hidden className={`shrink-0 text-muted transition-transform ${clientOpen ? "rotate-180" : ""}`} />
        </button>
        {clientOpen && (
          <div className="space-y-3 border-t border-line p-4">
            {clientFields}
            {more ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field htmlFor="pj" label={t("editor.project")}>
                  <input id="pj" className="input" maxLength={200} value={q.project} onChange={(e) => setQ({ ...q, project: e.target.value })} />
                </Field>
                <Field htmlFor="dl" label={t("editor.delay")}>
                  <input id="dl" className="input" maxLength={120} placeholder={t("editor.delayPlaceholder")} value={q.delay} onChange={(e) => setQ({ ...q, delay: e.target.value })} />
                </Field>
                <Field htmlFor="nt" label={t("editor.notes")}>
                  <input id="nt" className="input" maxLength={600} value={q.notes} onChange={(e) => setQ({ ...q, notes: e.target.value })} />
                </Field>
              </div>
            ) : (
              <button type="button" className="text-sm font-semibold text-primary" onClick={() => setMore(true)}>+ {t("app.moreDetails")}</button>
            )}
          </div>
        )}
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
        {picking ? (
          <div className="card space-y-3 !p-4">
            <WorkPicker onPick={addLine} />
            <button type="button" className="btn-secondary w-full" onClick={() => setPicking(false)}>{t("dlg.cancel")}</button>
          </div>
        ) : (
          <button type="button" className="btn-secondary w-full" onClick={() => setPicking(true)}>
            <Plus size={16} aria-hidden />
            {t("editor.addLine")}
          </button>
        )}
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

      <button type="button" className="btn-primary !min-h-12 w-full" onClick={() => needClient(finish, true)}>
        <Check size={18} aria-hidden />
        {t("app.saveQuote")}
      </button>

      {ask && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 sm:items-center sm:justify-center" onClick={() => setAsk(null)} onKeyDown={(e) => e.key === "Escape" && setAsk(null)}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="ask-title"
            className="w-full space-y-4 rounded-t-2xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              const run = ask.run;
              setAsk(null);
              run();
            }}
          >
            <div>
              <h2 id="ask-title" className="text-lg font-bold">{t("app.clientAsk")}</h2>
              <p className="text-sm text-muted">{t("app.clientAskText")}</p>
            </div>
            {clientFields}
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => (ask.skip ? (setAsk(null), ask.run()) : setAsk(null))}>
                {ask.skip ? t("app.update.later") : t("dlg.cancel")}
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={!q.client.name.trim()}>{t("app.continue")}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
