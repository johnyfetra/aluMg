"use client";
import { Box, ChevronDown, Copy, Eye, FileDown, Image as ImageIcon, Inbox, LayoutGrid, Rows3, Ruler, Save, Send, Table2, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { mutate } from "swr";
import ProfileNeeds from "./ProfileNeeds";
import ChatButton from "./ChatButton";
import LineComments from "./LineComments";
import LinesTable from "./LinesTable";
import Timeline from "./Timeline";
import Viewer3DLoader from "./Viewer3DLoader";
import { Choice, Field, FinishPicker } from "./ui";
import { allPieces, billedArea, cutList, cuttingPlan, fmt, lineTotal, meters, normalize, planTotals, unitPrice } from "@/lib/calc";
import { ApiError, request, useQuoteCatalog, useQuotes, useSettings } from "@/lib/client";
import { lineTitle } from "@/lib/describe";
import { drawingSvg } from "@/lib/drawing";
import { type T, useI18n } from "@/lib/i18n";
import {
  CATEGORIES,
  CONTROLS,
  EXTRAS,
  FINISHES,
  GLASSES,
  GUARDS,
  INFILLS,
  type Category,
  type Line,
  OPENINGS_BY_CATEGORY,
  PATTERNS,
  PATTERN_GLASSES,
  DIRECTIONS,
  type LeafMode,
  finishOn,
  hasLeafConfig,
  lineMarks,
  rangeOn,
  leafMarks,
  leafModes,
  presetModes,
  RANGES,
  SHUTTERS,
  THICKNESSES,
  type Quote,
  type Settings,
  leavesSpec,
  lineSchema,
} from "@/lib/model";
import Select from "./Select";
import { totals } from "@/lib/totals";

const DEFAULT_SIZE: Record<Category, [number, number]> = {
  fenetre: [1200, 1000],
  porte: [900, 2100],
  volet: [1200, 1500],
  "garde-corps": [2000, 1000],
  cloison: [2400, 2400],
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const price = (l: Line, s: Settings) => unitPrice(l, s.tariffs, s.surcharges, s.minArea);

export function newLine(s: Settings): Line {
  const base: Line = {
    id: crypto.randomUUID(),
    category: "fenetre",
    opening: "coulissant",
    leaves: 2,
    shutter: "roulant",
    control: "manuel",
    guard: "barreaudage",
    range: RANGES.find((r) => rangeOn(s.market, r)) ?? "asiatique", // premier choix que les fournisseurs ont
    finish: FINISHES.find((f) => finishOn(s.market, f.id))?.id ?? "blanc",
    infill: "vitree",
    glassType: "clair",
    thickness: "5",
    pattern: "none",
    extras: [],
    width: DEFAULT_SIZE.fenetre[0],
    height: DEFAULT_SIZE.fenetre[1],
    qty: 1,
    unit: 0,
  };
  return { ...base, unit: price(base, s) };
}

export default function QuoteEditor({ id }: { id?: string }) {
  const { t } = useI18n();
  const { quotes, loading } = useQuotes();
  const { settings } = useSettings();
  if (loading || !settings || !quotes) return null;
  const existing = id ? quotes.find((q) => q.id === id) : undefined;
  if (id && !existing) {
    return (
      <p className="card">
        {t("editor.notFound")}{" "}
        <Link href="/devis" className="text-primary underline">
          {t("common.back")}
        </Link>
      </p>
    );
  }
  return <Form key={id ?? "new"} existing={existing} settings={settings} />;
}

function Form({ existing, settings }: { existing?: Quote; settings: Settings }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { save } = useQuotes();
  // gammes et couleurs proposées : celles du catalogue de ce devis s'il en a un, sinon du catalogue général
  const catalog = useQuoteCatalog(existing?.id);
  const eff = catalog.market ? { ...settings, market: catalog.market } : settings;
  const [attachCut, setAttachCut] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [persisted, setPersisted] = useState(!!existing);
  // Ouvrages : cartes dépliables ou tableau. Un devis à un seul ouvrage s'ouvre déplié, un devis plus long s'ouvre replié.
  const [first] = useState(() => newLine(settings));
  const [layout, setLayout] = useState<"cards" | "table">("cards");
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set((existing ?? { lines: [first] }).lines.length > 1 ? [] : (existing ?? { lines: [first] }).lines.map((l) => l.id)));
  // devis d'un client déjà envoyé, accepté ou refusé : en lecture seule (le client doit toujours voir ce qu'il a accepté)
  // Envoyé au client qui n'a pas encore répondu : encore modifiable (chaque modification crée une révision).
  const revisable = !!existing?.clientId && existing.status === "sent";
  const locked = !!existing && !["requested", "draft", "negotiation"].includes(existing.status) && !revisable;
  const [focusId, setFocusId] = useState<string | null>(null);
  const [q, setQ] = useState<Quote>(
    () =>
      existing ?? {
        id: crypto.randomUUID(),
        number: "",
        date: new Date().toISOString(),
        status: "draft",
        client: { name: "", phone: "", address: "", email: "" },
        project: "",
        delay: "",
        notes: "",
        lines: [first],
        discount: 0,
        progress: 0,
        rev: 0,
        terms: { tva: settings.tva, deposit: settings.deposit, validityDays: settings.validityDays },
      },
  );

  const setLine = (i: number, patch: Partial<Line>) =>
    setQ((cur) => ({
      ...cur,
      lines: cur.lines.map((l, j) => {
        if (j !== i) return l;
        const sizeReset = patch.category && patch.category !== l.category ? { width: DEFAULT_SIZE[patch.category][0], height: DEFAULT_SIZE[patch.category][1], leaves: patch.category === "cloison" ? 3 : 2 } : {};
        const next = normalize({ ...l, ...sizeReset, ...patch });
        // le prix suit la configuration, sauf si le menuisier vient de le fixer à la main
        return "unit" in patch ? next : { ...next, unit: price(next, settings) };
      }),
    }));
  const marks = lineMarks(q.lines);
  const allOpen = q.lines.every((l) => openIds.has(l.id));
  const toggleOpen = (id: string) =>
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
  // Lien profond d'une notification (?ligne=…) : on déplie l'ouvrage visé et on s'y rend.
  const deepLinked = useRef(false);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("ligne");
    if (deepLinked.current || !id || !existing?.lines.some((l) => l.id === id)) return;
    deepLinked.current = true;
    setOpenIds(new Set([id]));
    setFocusId(id);
    requestAnimationFrame(() => document.getElementById(`line-${id}`)?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }, [existing]);
  const setClient = (patch: Partial<Quote["client"]>) => setQ((c) => ({ ...c, client: { ...c.client, ...patch } }));
  const num = (v: string) => Number(v) || 0;

  const valid = (l: Line) => lineSchema.safeParse(l).success;
  const validLines = q.lines.filter(valid);
  const { discount, ht, tva, ttc } = totals({ lines: validLines, terms: q.terms, discount: q.discount });
  const plan = planTotals(cuttingPlan(allPieces(validLines), settings.barLength, settings.kerf));

  // Enregistre le devis (création ou mise à jour) ; renvoie le devis enregistré, ou null si une ligne est invalide / si l'envoi échoue.
  const persist = async (): Promise<Quote | null> => {
    if (locked) return q;
    if (validLines.length !== q.lines.length || q.lines.length === 0) {
      setMsg({ ok: false, text: t("editor.needLine") });
      return null;
    }
    try {
      const saved = await save(q, !persisted);
      setPersisted(true);
      setQ(saved);
      return saved;
    } catch (e) {
      console.error("[alumg] enregistrement en échec", e);
      setMsg({ ok: false, text: t("common.error") });
      return null;
    }
  };

  const submit = async (withPdf: boolean) => {
    const saved = await persist();
    if (!saved) return;
    setMsg({ ok: true, text: revisable ? t("editor.revSaved") : t("editor.saved") });
    try {
      if (withPdf) {
        const { quotePdf } = await import("@/lib/pdf");
        await quotePdf(saved, settings, t, locale, attachCut);
      }
    } catch (e) {
      console.error("[alumg] génération du PDF en échec", e);
      setMsg({ ok: false, text: t("common.error") });
      return;
    }
    if (!existing) router.replace(`/devis/${saved.id}`);
  };

  // Demande d'un client : le menuisier vérifie les prix puis envoie le devis (ou décline la demande).
  // Un devis saisi par le menuisier s'envoie au compte client retrouvé par e-mail ; une demande de client est déjà liée.
  const canAct = persisted && ["requested", "draft", "negotiation"].includes(q.status);
  const [note, setNote] = useState("");
  const act = async (type: "send" | "decline") => {
    if (type === "decline" && !confirm(t("editor.confirmDecline"))) return;
    if (type === "send" && !q.clientId && !q.client.email.trim()) return setMsg({ ok: false, text: t("editor.needEmail") });
    const saved = await persist();
    if (!saved) return;
    try {
      await request("POST", `/api/quotes/${saved.id}/actions`, { type, ...(note.trim() ? { message: note.trim() } : {}) });
      await mutate("/api/quotes");
      router.push("/devis");
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError && e.code === "incomplete" ? t("editor.incompletePrices") : e instanceof ApiError && e.code === "no_client_account" ? t("editor.noClientAccount") : t("common.error") });
    }
  };

  // Devis sans compte client déjà envoyé : on repart d'une copie en brouillon (l'original reste tel qu'il a été remis).
  const newVersion = async () => {
    try {
      const copy = await save({ ...q, id: crypto.randomUUID(), number: "", status: "draft", progress: 0, date: new Date().toISOString() }, true);
      router.push(`/devis/${copy.id}`);
    } catch {
      setMsg({ ok: false, text: t("common.error") });
    }
  };

  // Ouvre la page de détail des profilés (du devis, ou d'un ouvrage) après avoir enregistré.
  const openNeeds = async (lineId?: string) => {
    const saved = await persist();
    if (saved) router.push(`/devis/${saved.id}/profils${lineId ? `/${lineId}` : ""}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{q.number ? `${t("editor.titleEdit")} ${q.number}` : t("editor.titleNew")}</h1>
        <div className="flex flex-wrap gap-2">
          {persisted && (
            <Link href={`/devis/${q.id}/apercu`} className="btn-secondary">
              <Eye size={16} aria-hidden />
              {t("preview.open")}
            </Link>
          )}
          <Link href="/devis" className="btn-secondary">
            {t("common.back")}
          </Link>
        </div>
      </div>

      {!settings.company && (
        <p className="card border-warn text-sm" role="note">
          {t("editor.setupHint")}{" "}
          <Link href="/reglages" className="font-semibold text-primary underline">
            {t("editor.setupLink")}
          </Link>
        </p>
      )}

      {revisable && (
        <p role="note" className="card border-primary text-sm">
          {t("editor.revisable")} ({t("editor.revision")} {q.rev ?? 0})
        </p>
      )}
      {locked && (
        <p role="note" className="card border-primary text-sm">
          {t("editor.locked")}
        </p>
      )}

      {q.request && (
        <section className="card space-y-2 border-c3" aria-labelledby="h-req" role="note">
          <h2 id="h-req" className="flex items-center gap-2 text-lg font-semibold">
            <Inbox size={20} aria-hidden className="text-c3" />
            {t("editor.requestTitle")}
          </h2>
          <p className="text-sm text-muted">{t("editor.requestHint")}</p>
          <dl className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            <div><dt className="inline text-muted">{t("editor.clientName")} : </dt><dd className="inline font-medium">{q.client.name}</dd></div>
            <div><dt className="inline text-muted">{t("editor.clientPhone")} : </dt><dd className="inline font-medium">{q.client.phone}</dd></div>
            {q.request.siteAddress && <div><dt className="inline text-muted">{t("editor.clientAddress")} : </dt><dd className="inline font-medium">{q.request.siteAddress}</dd></div>}
            {q.request.wantedDate && <div><dt className="inline text-muted">{t("req.wantedDate")} : </dt><dd className="inline font-medium">{q.request.wantedDate}</dd></div>}
          </dl>
          {q.request.message && <p className="whitespace-pre-line rounded-lg bg-surface-2 px-3 py-2 text-sm">{q.request.message}</p>}
        </section>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <section className="card space-y-4" aria-labelledby="h-client">
            <h2 id="h-client" className="text-lg font-semibold">
              {t("editor.client")}
            </h2>
            <fieldset disabled={locked} className="m-0 grid min-w-0 gap-4 border-0 p-0 sm:grid-cols-2 lg:grid-cols-3">
              <Field htmlFor="cn" label={t("editor.clientName")}>
                <input id="cn" className="input" autoComplete="name" maxLength={120} value={q.client.name} onChange={(e) => setClient({ name: e.target.value })} />
              </Field>
              <Field htmlFor="cp" label={t("editor.clientPhone")}>
                <input id="cp" className="input" type="tel" autoComplete="tel" maxLength={40} value={q.client.phone} onChange={(e) => setClient({ phone: e.target.value })} />
              </Field>
              <Field htmlFor="ce" label={t("editor.clientEmail")} hint={q.clientId ? undefined : t("editor.clientEmailHint")}>
                <input id="ce" className="input" type="email" autoComplete="email" maxLength={160} value={q.client.email ?? ""} disabled={!!q.clientId} onChange={(e) => setClient({ email: e.target.value })} />
              </Field>
              <Field htmlFor="ca" label={t("editor.clientAddress")}>
                <input id="ca" className="input" maxLength={200} value={q.client.address} onChange={(e) => setClient({ address: e.target.value })} />
              </Field>
              <Field htmlFor="pj" label={t("editor.project")}>
                <input id="pj" className="input" maxLength={200} value={q.project} onChange={(e) => setQ({ ...q, project: e.target.value })} />
              </Field>
              <Field htmlFor="dl" label={t("editor.delay")}>
                <input id="dl" className="input" maxLength={120} placeholder={t("editor.delayPlaceholder")} value={q.delay} onChange={(e) => setQ({ ...q, delay: e.target.value })} />
              </Field>
              <Field htmlFor="nt" label={t("editor.notes")}>
                <input id="nt" className="input" maxLength={600} value={q.notes} onChange={(e) => setQ({ ...q, notes: e.target.value })} />
              </Field>
            </fieldset>
          </section>

          <section className="space-y-4" aria-labelledby="h-lines">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="h-lines" className="text-lg font-semibold">
                {t("editor.lines")} <span className="text-sm font-normal text-muted">({q.lines.length})</span>
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {layout === "cards" && q.lines.length > 1 && (
                  <button type="button" className="btn-secondary !min-h-9 !px-3" onClick={() => setOpenIds(allOpen ? new Set() : new Set(q.lines.map((l) => l.id)))}>
                    <Rows3 size={15} aria-hidden />
                    {allOpen ? t("editor.collapseAll") : t("editor.expandAll")}
                  </button>
                )}
                <div role="group" aria-label={t("editor.layout")} className="flex gap-0.5 rounded-full border border-line bg-surface p-0.5">
                  {([["cards", LayoutGrid, "editor.viewCards"], ["table", Table2, "editor.viewTable"]] as const).map(([k, Icon, label]) => (
                    <button key={k} type="button" aria-pressed={layout === k} onClick={() => setLayout(k)} className={`flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${layout === k ? "bg-primary text-on-primary" : "text-muted hover:text-ink"}`}>
                      <Icon size={14} aria-hidden />
                      {t(label)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {layout === "table" ? (
              <LinesTable
                lines={q.lines}
                t={t}
                marks={marks}
                validIds={new Set(validLines.map((l) => l.id))}
                locked={locked}
                onEdit={(i) => {
                  setOpenIds(new Set([q.lines[i].id]));
                  setLayout("cards");
                  requestAnimationFrame(() => document.getElementById(`line-${q.lines[i].id}`)?.scrollIntoView({ block: "start" }));
                }}
                onDuplicate={(i) => duplicate(i)}
                onRemove={q.lines.length > 1 ? (i) => setQ({ ...q, lines: q.lines.filter((_, j) => j !== i) }) : undefined}
              />
            ) : (
              q.lines.map((l, i) => (
                <LineCard
                  key={l.id}
                  l={l}
                  i={i}
                  t={t}
                  settings={eff}
                  valid={valid(l)}
                  locked={locked}
                  mark={marks[i]}
                  quoteId={q.clientId && persisted ? q.id : undefined}
                  focused={focusId === l.id}
                  open={openIds.has(l.id)}
                  onToggle={() => toggleOpen(l.id)}
                  onChange={(p) => setLine(i, p)}
                  onRemove={q.lines.length > 1 ? () => setQ({ ...q, lines: q.lines.filter((_, j) => j !== i) }) : undefined}
                  onDuplicate={() => duplicate(i)}
                  onNeeds={() => openNeeds(l.id)}
                  num={num}
                />
              ))
            )}
            {!locked && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  const nl = newLine(eff);
                  setQ({ ...q, lines: [...q.lines, nl] });
                  setOpenIds((o) => new Set(o).add(nl.id));
                  setLayout("cards");
                }}
              >
                + {t("editor.addLine")}
              </button>
            )}
          </section>

          <fieldset disabled={locked} className="m-0 min-w-0 space-y-6 border-0 p-0">
            <ProfileNeeds lines={validLines} barLen={settings.barLength} kerf={settings.kerf} t={t} />
            {q.clientId && persisted && <ChatButton target={{ client: q.clientId }} label={t("msg.contactClient")} />}
            {q.clientId && persisted && <Timeline quoteId={q.id} />}
          </fieldset>
        </div>

        {/* Colonne de synthèse : reste visible pendant la saisie sur grand écran */}
        <aside className="space-y-4 xl:sticky xl:top-20" aria-label="Total">
          {persisted && (
            <Link href={`/devis/${q.id}/apercu`} className="btn-primary w-full">
              <Eye size={18} aria-hidden />
              {t("preview.full")}
            </Link>
          )}
          <section className="card space-y-2">
            <div className="flex items-end justify-between gap-3 text-sm">
              <label className="flex items-center gap-2 text-muted">
                {t("editor.discount")}
                <input type="number" inputMode="decimal" min={0} max={100} className="input !min-h-9 !w-20 !py-1" value={q.discount || ""} placeholder="0" onChange={(e) => setQ({ ...q, discount: Math.min(100, Math.max(0, num(e.target.value))) })} />
              </label>
              {discount > 0 && <span>− {fmt(discount)} {t("common.currency")}</span>}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">{t("editor.totalHt")}</span>
              <span>{fmt(ht)} {t("common.currency")}</span>
            </div>
            {q.terms.tva > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">{t("editor.totalTva")} {q.terms.tva} %</span>
                <span>{fmt(tva)} {t("common.currency")}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-line pt-2">
              <span className="font-semibold">{t("editor.totalTtc")}</span>
              <span className="text-2xl font-bold text-primary">{fmt(ttc)} <span className="text-sm">{t("common.currency")}</span></span>
            </div>
          </section>

          <section className="card space-y-1 text-sm">
            <h3 className="font-semibold">{t("editor.materials")}</h3>
            <button type="button" className="btn-secondary mb-2 w-full" onClick={() => openNeeds()}>
              <Ruler size={16} aria-hidden />
              {t("needsPage.open")}
            </button>
            <p className="flex justify-between"><span className="text-muted">{t("needs.totalBars")}</span><span className="font-semibold">{plan.bars}</span></p>
            <p className="flex justify-between"><span className="text-muted">{t("needs.totalUsed")}</span><span className="font-semibold">{meters(plan.usedLen)}</span></p>
            <p className="flex justify-between"><span className="text-muted">{t("needs.totalWaste")}</span><span className="font-semibold">{meters(plan.wasteLen)} ({plan.wastePct} %)</span></p>
          </section>

          {canAct && (
            <section className="card space-y-3 border-primary" aria-labelledby="h-act">
              <h3 id="h-act" className="font-semibold">
                {t("editor.sendClient")}
              </h3>
              <label className="block text-sm font-medium">
                {t("editor.noteToClient")}
                <textarea className="input mt-1 min-h-20 font-normal" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
              <button type="button" className="btn-primary w-full" onClick={() => act("send")}>
                <Send size={16} aria-hidden />
                {t("editor.sendClient")}
              </button>
              {q.clientId && q.status !== "negotiation" && (
                <button type="button" className="btn-danger w-full" onClick={() => act("decline")}>
                  <XCircle size={16} aria-hidden />
                  {t("editor.decline")}
                </button>
              )}
            </section>
          )}

          <section className="card space-y-3">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" className="size-5" checked={attachCut} onChange={(e) => setAttachCut(e.target.checked)} />
              {t("editor.attachCut")}
            </label>
            <div className="flex flex-col gap-2">
              <button type="button" className="btn-primary" onClick={() => submit(true)}>
                <FileDown size={18} aria-hidden />
                {locked ? t("editor.pdfOnly") : t("editor.savePdf")}
              </button>
              {locked && !q.clientId && (
                <button type="button" className="btn-secondary" onClick={newVersion}>
                  <Copy size={18} aria-hidden />
                  {t("editor.newVersion")}
                </button>
              )}
              {!locked && (
                <button type="button" className="btn-secondary" onClick={() => submit(false)}>
                  <Save size={18} aria-hidden />
                  {revisable ? t("editor.saveRevision") : t("editor.saveDraft")}
                </button>
              )}
            </div>
            <p role="status" className={`text-sm font-medium ${msg?.ok ? "text-ok" : "text-danger"}`}>
              {msg?.text}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

export function LineCard({
  l, i, t, settings, valid, onChange, onRemove, onDuplicate, onNeeds, num, clientMode = false, open = true, onToggle, locked = false, mark, quoteId, focused = false,
}: {
  l: Line;
  i: number;
  t: T;
  settings: Settings;
  valid: boolean;
  onChange: (p: Partial<Line>) => void;
  onRemove?: () => void;
  onDuplicate: () => void;
  onNeeds: () => void;
  num: (v: string) => number;
  clientMode?: boolean; // demande d'un client : pas de prix ni de détail des profilés
  open?: boolean;
  onToggle?: () => void; // fourni : la carte est dépliable, avec un en-tête résumé
  locked?: boolean;
  mark?: string; // repère d'ouvrage (F-01…)
  quoteId?: string; // devis lié à un client : affiche le fil de commentaires de l'ouvrage
  focused?: boolean; // ouvrage visé par une notification
}) {
  const [view, setView] = useState<"2d" | "3d">("2d");
  const cat = l.category;
  const openable = cat === "fenetre" || cat === "porte";
  const hasGlass = cat === "garde-corps" ? l.guard === "verre" : cat !== "volet" && !(cat === "porte" && l.infill === "pleine");
  const canPattern = PATTERN_GLASSES.includes(l.glassType);
  const sk = valid ? drawingSvg(l, l.id, 360, 280) : null;
  const tooLong = valid && cuttingPlan(cutList(l).pieces).some((p) => p.tooLong.length > 0);
  const auto = valid ? price(l, settings) : l.unit;
  const spec = leavesSpec(l);
  const p = (k: string) => `${l.id}-${k}`;

  const title = `${mark ?? `${t("editor.line")} ${i + 1}`} — ${cap(lineTitle(l, t))}`;
  const grid = "grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] 2xl:grid-cols-[minmax(0,1fr)_23rem]";
  const body = (
    <>
      <div className="min-w-0 space-y-4">
        <Section title={t("editor.sectionConfig")}>
          <Choice dense name={p("cat")} legend={t("editor.category")} value={cat} options={CATEGORIES.map((c) => ({ value: c, label: t(`cat.${c}`) }))} onChange={(category) => onChange({ category })} />

          {cat === "volet" && (
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <Choice dense name={p("sh")} legend={t("editor.shutter")} value={l.shutter} options={SHUTTERS.map((s) => ({ value: s, label: t(`shutter.${s}`) }))} onChange={(shutter) => onChange({ shutter })} />
              <Choice dense name={p("ct")} legend={t("editor.control")} value={l.control} options={CONTROLS.map((c) => ({ value: c, label: cap(t(`control.${c}`)) }))} onChange={(control) => onChange({ control })} />
            </div>
          )}
          {cat === "garde-corps" && <Choice dense name={p("gd")} legend={t("editor.guard")} value={l.guard} options={GUARDS.map((g) => ({ value: g, label: cap(t(`guard.${g}`)) }))} onChange={(guard) => onChange({ guard })} />}
          {openable && <Choice dense name={p("op")} legend={t("editor.opening")} value={l.opening} options={OPENINGS_BY_CATEGORY[cat].map((o) => ({ value: o, label: cap(t(`opening.${o}`)) }))} onChange={(opening) => onChange({ opening })} />}

          {spec && spec.max > spec.min && (
            <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
              <Choice
                dense
                name={p("lv")}
                legend={cat === "cloison" ? t("editor.panels") : t("editor.leaves")}
                value={l.leaves}
                options={spec.presets.map((n) => ({ value: n, label: n === 1 ? t("editor.oneLeaf") : String(n) }))}
                onChange={(leaves) => onChange({ leaves })}
              />
              <Field htmlFor={p("lc")} label={t("editor.leavesCustom")} hint={t("editor.leavesRange").replace("{min}", String(spec.min)).replace("{max}", String(spec.max))}>
                <input id={p("lc")} className="input !min-h-9 !w-24 !py-1" type="number" inputMode="numeric" min={spec.min} max={spec.max} value={l.leaves} onChange={(e) => onChange({ leaves: num(e.target.value) })} />
              </Field>
            </div>
          )}

          {hasLeafConfig(l) && <LeafConfig l={l} t={t} onChange={onChange} id={l.id} />}
          {cat === "porte" && <Choice dense name={p("in")} legend={t("editor.infill")} value={l.infill} options={INFILLS.map((x) => ({ value: x, label: t(`infill.${x}`) }))} onChange={(infill) => onChange({ infill })} />}
        </Section>

        <Section title={t("editor.sectionSize")}>
          <div className="grid grid-cols-3 gap-3">
            <Field htmlFor={p("w")} label={cat === "garde-corps" ? t("editor.length") : t("editor.width")}>
              <input id={p("w")} className="input !min-h-10" type="number" inputMode="numeric" value={l.width || ""} aria-invalid={!valid} onChange={(e) => onChange({ width: num(e.target.value) })} />
            </Field>
            <Field htmlFor={p("h")} label={t("editor.height")}>
              <input id={p("h")} className="input !min-h-10" type="number" inputMode="numeric" value={l.height || ""} aria-invalid={!valid} onChange={(e) => onChange({ height: num(e.target.value) })} />
            </Field>
            <Field htmlFor={p("q")} label={t("editor.qty")}>
              <input id={p("q")} className="input !min-h-10" type="number" inputMode="numeric" min={1} value={l.qty || ""} onChange={(e) => onChange({ qty: num(e.target.value) })} />
            </Field>
          </div>
          {!valid && <p role="alert" className="text-sm font-medium text-danger">{t("editor.invalidSize")}</p>}
          {tooLong && <p role="alert" className="text-sm font-medium text-danger">{t("editor.tooLong")}</p>}
        </Section>

        <Section title={t("editor.sectionFinish")}>
          <Choice dense name={p("rg")} legend={t("editor.range")} value={l.range} options={RANGES.filter((r) => r === l.range || rangeOn(settings.market, r)).map((r) => ({ value: r, label: t(`range.${r}`) }))} onChange={(range) => onChange({ range })} />
          <FinishPicker dense name={p("fn")} legend={t("editor.finish")} value={l.finish} onChange={(finish) => onChange({ finish })} t={t} hide={settings.market.off?.finishes} />

          {hasGlass && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field htmlFor={p("gt")} label={t("editor.glassType")}>
                <Select id={p("gt")} className="!min-h-10" value={l.glassType} onChange={(v) => onChange({ glassType: v as Line["glassType"] })} options={GLASSES.map((g) => ({ value: g.id, label: t(g.label) }))} />
              </Field>
              <Field htmlFor={p("th")} label={t("editor.thickness")}>
                <Select id={p("th")} className="!min-h-10" value={l.thickness} onChange={(v) => onChange({ thickness: v as Line["thickness"] })} options={THICKNESSES.map((x) => ({ value: x, label: t(`thickness.${x}`) }))} />
              </Field>
              <Field htmlFor={p("pt")} label={t("editor.pattern")}>
                <Select id={p("pt")} className="!min-h-10" disabled={!canPattern} value={canPattern ? l.pattern : "none"} onChange={(v) => onChange({ pattern: v as Line["pattern"] })} options={PATTERNS.map((x) => ({ value: x, label: t(`pattern.${x}`) }))} />
              </Field>
            </div>
          )}

          {openable && (
            <fieldset>
              <legend className="mb-1 text-sm font-medium">{t("editor.extras")}</legend>
              <div className="flex flex-wrap gap-x-5">
                {EXTRAS.map((x) => (
                  <label key={x} className="flex min-h-9 items-center gap-2 text-sm">
                    <input type="checkbox" className="size-4" checked={l.extras.includes(x)} onChange={(e) => onChange({ extras: e.target.checked ? [...l.extras, x] : l.extras.filter((y) => y !== x) })} />
                    {t(`extra.${x}`)}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </Section>

        {!clientMode && (
          <Section title={t("editor.sectionPrice")}>
            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
              <div className="w-44">
                <Field htmlFor={p("u")} label={t("editor.unit")} hint={t("editor.unitHint")}>
                  <input id={p("u")} className="input !min-h-10" type="number" inputMode="numeric" min={0} value={l.unit || ""} onChange={(e) => onChange({ unit: num(e.target.value) })} />
                </Field>
              </div>
              <div>
                <p className="text-sm text-muted">{t("editor.lineTotal")}</p>
                <p className="text-xl font-bold tabular-nums">{fmt(lineTotal(l))} {t("common.currency")}</p>
                {valid && <p className="text-xs text-muted">{t("editor.area")} : {fmt(Math.round(billedArea(l, settings.minArea) * 100) / 100)} m²</p>}
              </div>
              {auto !== l.unit && (
                <button type="button" className="btn-secondary !min-h-9" onClick={() => onChange({ unit: auto })}>
                  {t("editor.recalc")}
                </button>
              )}
            </div>
          </Section>
        )}
      </div>

      <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted">{view === "3d" ? t("viewer.title") : t("editor.preview")}</p>
          <div role="group" aria-label={t("editor.preview")} className="flex gap-0.5 rounded-full border border-line p-0.5">
            <button type="button" aria-pressed={view === "2d"} onClick={() => setView("2d")} className={`flex min-h-8 items-center gap-1 rounded-full px-2.5 text-xs font-medium ${view === "2d" ? "bg-primary text-on-primary" : "text-muted hover:text-ink"}`}>
              <ImageIcon size={13} aria-hidden />
              {t("viewer.show2d")}
            </button>
            <button type="button" aria-pressed={view === "3d"} disabled={!valid} onClick={() => setView("3d")} className={`flex min-h-8 items-center gap-1 rounded-full px-2.5 text-xs font-medium disabled:opacity-50 ${view === "3d" ? "bg-primary text-on-primary" : "text-muted hover:text-ink"}`}>
              <Box size={13} aria-hidden />
              {t("viewer.show3d")}
            </button>
          </div>
        </div>
        {view === "3d" && valid ? (
          <Viewer3DLoader line={l} />
        ) : sk ? (
          <div role="img" aria-label={`${lineTitle(l, t)} ${l.width} × ${l.height} mm`} className="flex justify-center rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: sk.svg }} />
        ) : (
          <div className="h-44 rounded-xl bg-surface-2" />
        )}
        {!clientMode && (
          <button type="button" className="btn-secondary w-full" onClick={onNeeds} disabled={!valid}>
            <Ruler size={16} aria-hidden />
            {t("needsPage.open")}
          </button>
        )}
        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onDuplicate}>
            <Copy size={16} aria-hidden />
            {t("editor.duplicateLine")}
          </button>
          {onRemove && (
            <button type="button" className="btn-danger" onClick={onRemove} aria-label={t("editor.removeLine")} title={t("editor.removeLine")}>
              <Trash2 size={16} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </>
  );

  if (!onToggle)
    return (
      <fieldset className={`card ${grid}`}>
        <legend className="px-2 text-sm font-semibold text-muted">{title}</legend>
        {body}
      </fieldset>
    );

  const finish = FINISHES.find((f) => f.id === l.finish);
  const thumb = valid && !open ? drawingSvg(l, `th${l.id}`, 76, 58) : null;
  const leafList = valid && (cat === "fenetre" || cat === "porte" || cat === "cloison") && l.leaves > 1 ? leafMarks(l).join(" · ") : "";
  return (
    <div id={`line-${l.id}`} className={`card scroll-mt-20 !p-0 ${valid ? "" : "border-danger"} ${focused ? "ring-2 ring-primary" : ""}`}>
      <h3 className="m-0">
        <button type="button" aria-expanded={open} aria-controls={`${l.id}-body`} onClick={onToggle} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left hover:bg-surface-2/60 sm:px-6">
          <ChevronDown size={18} aria-hidden className={`shrink-0 text-muted transition-transform ${open ? "" : "-rotate-90"}`} />
          {thumb && <span aria-hidden className="hidden h-14 w-[4.75rem] shrink-0 place-items-center rounded-lg bg-white sm:grid p-0.5 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: thumb.svg }} />}
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{title}</span>
            <span className="flex flex-wrap items-center gap-x-2 text-sm font-normal text-muted">
              <span>{valid ? `${l.width} × ${l.height} mm` : t("editor.invalidSize")}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-3 rounded-full border border-line" style={{ background: finish?.hex }} />
                {t(`range.${l.range}`)}
              </span>
              {leafList && (
                <>
                  <span aria-hidden>·</span>
                  <span className="font-medium tabular-nums">{leafList}</span>
                </>
              )}
            </span>
          </span>
          {!clientMode && (
            <span className="shrink-0 text-right">
              <span className="block font-semibold tabular-nums">{valid ? fmt(lineTotal(l)) : "—"} {t("common.currency")}</span>
              <span className="text-xs font-normal text-muted">{t("editor.qty")} : {l.qty}</span>
            </span>
          )}
          <span className="sr-only">{open ? t("editor.collapseLine") : t("editor.expandLine")}</span>
        </button>
      </h3>
      {open && (
        <fieldset id={`${l.id}-body`} disabled={locked} className={`m-0 border-0 border-t border-line p-4 sm:p-6 ${grid}`}>
          {body}
        </fieldset>
      )}
      {open && quoteId && (
        <div className="border-t border-line p-4 sm:p-6">
          <LineComments quoteId={quoteId} lineId={l.id} me="menuisier" />
        </div>
      )}
    </div>
  );
}


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-line pt-3 first:border-t-0 first:pt-0">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h4>
      {children}
    </section>
  );
}

// Un vantail par tuile : repère professionnel (V1, F1…) et fonction (fixe, coulisse, charnières). Les raccourcis remplissent toutes les tuiles d'un coup.
function LeafConfig({ l, t, onChange, id }: { l: Line; t: T; onChange: (p: Partial<Line>) => void; id: string }) {
  const modes = leafModes(l);
  const marks = leafMarks(l);
  const sliding = l.opening === "coulissant";
  const n = l.leaves;
  const label = (m: LeafMode) => t(m === "F" ? "leaf.F" : m === "B" ? "leaf.B" : l.opening === "soufflet" ? "leaf.mobile" : sliding ? (m === "L" ? "leaf.slideL" : "leaf.slideR") : m === "L" ? "leaf.hingeL" : "leaf.hingeR");
  const allowed = (i: number): LeafMode[] => (sliding ? (["F", ...(i > 0 ? ["L"] : []), ...(i < n - 1 ? ["R"] : [])] as LeafMode[]) : l.opening === "soufflet" ? ["F", "L"] : l.category === "porte" ? ["F", "L", "R", "B"] : ["F", "L", "R"]);
  const same = (a: LeafMode[], b: LeafMode[]) => a.join() === b.join();
  const set = (i: number, m: LeafMode) => onChange({ leafCfg: modes.map((x, j) => (j === i ? m : x)) });
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-sm font-medium">{t("editor.leafConfig")}</legend>
      {sliding && (
        <div role="group" aria-label={t("editor.shortcuts")} className="flex flex-wrap items-center gap-1.5">
          {DIRECTIONS.map((d) => (
            <button key={d} type="button" aria-pressed={same(modes, presetModes(l, d))} onClick={() => onChange({ direction: d, leafCfg: presetModes(l, d) })} className="min-h-8 rounded-full border border-line px-3 text-xs font-medium hover:bg-surface-2 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-on-primary">
              {t(`dir.${d}.slide`)}
            </button>
          ))}
        </div>
      )}
      <ul className="flex flex-wrap gap-2">
        {modes.map((m, i) => (
          <li key={i} className={`flex min-w-[7.5rem] flex-col gap-1 rounded-lg border p-1.5 ${m === "F" ? "border-line bg-surface-2/60" : "border-primary/50 bg-primary/5"}`}>
            <label htmlFor={`${id}-lf${i}`} className="text-xs font-bold tabular-nums">{marks[i]}</label>
            <Select id={`${id}-lf${i}`} className="!min-h-8 !px-2 !py-0.5 text-xs" value={m} onChange={(v) => set(i, v as LeafMode)} options={allowed(i).map((x) => ({ value: x, label: label(x) }))} />
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
