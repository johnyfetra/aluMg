"use client";
import { Check, Mail, Pencil, Phone, UserCheck, Eye, Inbox, LayoutGrid, Rows3, Table2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { mutate } from "swr";
import ProfileNeeds from "./ProfileNeeds";
import QuoteStatusBar from "./QuoteStatusBar";
import ChatButton from "./ChatButton";
import ServicesEditor from "./ServicesEditor";
import LinesTable from "./LinesTable";
import Timeline from "./Timeline";
import { Avatar, Field } from "./ui";
import { allPieces, cuttingPlan, normalize, planTotals } from "@/lib/calc";
import { quoteMargin } from "@/lib/costing";
import { initSim, simulate } from "@/lib/procure";
import { useContacts } from "@/lib/client";
import { ApiError, request, useQuoteCatalog, useQuotes, useSettings } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { type EditMode, editMode, type Line, lineMarks, type Quote, type Settings, lineSchema } from "@/lib/model";
import Select from "./Select";
import { totals } from "@/lib/totals";
import { useConfirm } from "@/components/ConfirmDialog";
import { DEFAULT_SIZE, newLine, price } from "./quote/line";
import { LineCard } from "./quote/LineCard";
import SummaryAside from "./quote/SummaryAside";

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
  const ask = useConfirm();
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
  // Ce que devient une modification selon l'état du devis (voir `editMode` dans lib/model.ts) : seul un chantier terminé est figé.
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
        services: [],
        warranty: 12,
        discount: 0,
        progress: 0,
        rev: 0,
        terms: { tva: settings.tva, deposit: settings.deposit, validityDays: settings.validityDays },
      },
  );
  const mode: EditMode = existing ? editMode(q.status, !!q.clientId) : "free";
  const revisable = mode === "revise" || mode === "reconfirm" || mode === "amend";
  const locked = mode === "locked";

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
  // Carnet de clients : choisir un client remplit nom, téléphone et e-mail ; ?contact=<id> préremplit un nouveau devis.
  const { data: contacts = [] } = useContacts();
  const pickContact = (id: string) => {
    const c = contacts.find((x) => x.id === id);
    if (c) setQ((cur) => ({ ...cur, client: { ...cur.client, name: c.name, phone: c.phone, email: c.email } }));
  };
  // fiche client : formulaire ouvert seulement pour ajouter ou modifier
  const [editClient, setEditClient] = useState(() => !(existing && existing.client.name.trim()));
  const prefilled = useRef(false);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("contact");
    if (prefilled.current || existing || !id || !contacts.length) return;
    prefilled.current = true;
    pickContact(id);
    setEditClient(false); // client connu : on affiche sa fiche compacte
  }, [contacts, existing]); // eslint-disable-line react-hooks/exhaustive-deps
  // Fiche client : résumé compact une fois renseignée ; le formulaire ne s'ouvre que pour ajouter ou modifier.
  const clientReady = q.client.name.trim().length > 0;
  const linked = contacts.some((c) => c.account && c.email && c.email === q.client.email.trim().toLowerCase());
  const facts = ([[t("editor.project"), q.project], [t("editor.clientAddress"), q.client.address], [t("editor.delay"), q.delay], [t("svc.warranty"), q.warranty ? `${q.warranty} ${t("svc.months")}` : ""], [t("editor.notes"), q.notes]] as [string, string][]).filter(([, v]) => v.trim());
  const setClient = (patch: Partial<Quote["client"]>) => setQ((c) => ({ ...c, client: { ...c.client, ...patch } }));
  const num = (v: string) => Number(v) || 0;

  const valid = (l: Line) => lineSchema.safeParse(l).success;
  const validLines = q.lines.filter(valid);
  const { discount, ht, tva, ttc } = totals({ lines: validLines, terms: q.terms, discount: q.discount, services: q.services });
  const plan = planTotals(cuttingPlan(allPieces(validLines), settings.barLength, settings.kerf));
  // marge du devis entier : achats chiffrés avec le catalogue de ce devis, remise et coût des prestations compris
  const purchases = simulate(validLines, initSim(eff.market), settings.kerf).allCost; // React Compiler mémoïse
  const margin = quoteMargin({ lines: validLines, terms: q.terms, discount: q.discount, services: q.services }, eff, purchases);

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
    // modifier un devis accepté annule l'acceptation : on demande confirmation avant
    if (mode === "reconfirm" && JSON.stringify(q) !== JSON.stringify(existing) && !(await ask({ message: t("editor.confirmReconfirm"), tone: "danger", confirmLabel: t("editor.saveReconfirm") }))) return;
    const saved = await persist();
    if (!saved) return;
    setMsg({ ok: true, text: mode === "reconfirm" ? t("editor.reconfirmed") : revisable ? t("editor.revSaved") : t("editor.saved") });
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
  // (disponible dès la création : l'envoi enregistre d'abord le devis)
  const canAct = ["requested", "draft", "negotiation"].includes(q.status) || (q.status === "rejected" && !!q.clientId); // « rejected » : renvoyer le devis adapté
  const [note, setNote] = useState("");
  const act = async (type: "send" | "decline") => {
    if (type === "decline" && !(await ask({ message: t("editor.confirmDecline"), tone: "danger", confirmLabel: t("editor.decline") }))) return;
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

      {existing && <QuoteStatusBar quote={{ number: q.number, status: q.status, rev: q.rev, progress: q.progress }} total={ttc} side="menuisier" />}

      {!settings.company && (
        <p className="rounded-lg border border-warn/50 bg-warn/10 px-3 py-2 text-[13px]" role="note">
          {t("editor.setupHint")}{" "}
          <Link href="/reglages" className="font-semibold text-primary underline">
            {t("editor.setupLink")}
          </Link>
        </p>
      )}

      {existing && mode !== "free" && (
        <p role="note" className={`rounded-lg border px-3 py-2 text-[13px] ${mode === "reconfirm" ? "border-warn/50 bg-warn/10" : "border-primary/40 bg-primary/5"}`}>
          {t(`editor.mode.${mode}`)}
          {mode === "reopen" && q.lostReason && q.lostReason !== "declined" && <strong> {t("editor.lostWhy")} {t(`loss.${q.lostReason}`)}.</strong>}
          {revisable && ` (${t("editor.revision")} ${q.rev ?? 0})`}
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
          <section className="card space-y-3 !p-4" aria-labelledby="h-client">
            <div className="flex items-center justify-between gap-3">
              <h2 id="h-client" className="text-base font-semibold">
                {t("editor.client")}
              </h2>
              {!editClient && !locked && (
                <button type="button" className="btn-secondary !min-h-8 !px-2.5 text-xs" onClick={() => setEditClient(true)}>
                  <Pencil size={14} aria-hidden />
                  {t("editor.clientEdit")}
                </button>
              )}
              {editClient && clientReady && (
                <button type="button" className="btn-primary !min-h-8 !px-3 text-xs" onClick={() => setEditClient(false)}>
                  <Check size={14} aria-hidden />
                  {t("editor.clientDone")}
                </button>
              )}
            </div>
            {editClient ? (
              <fieldset disabled={locked} className="m-0 min-w-0 space-y-4 border-0 p-0">
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"><span aria-hidden className="h-4 w-1 rounded-full bg-primary" />{t("editor.groupClient")}</h3>
                {!q.clientId && contacts.length > 0 && (
                  <div className="mb-3 max-w-sm">
                    <Field htmlFor="ct-pick" label={t("ct.pick")}>
                      <Select id="ct-pick" value="" onChange={pickContact} options={[{ value: "", label: t("ct.pickNone") }, ...contacts.map((c) => ({ value: c.id, label: `${c.name}${c.phone ? ` · ${c.phone}` : ""}` }))]} />
                    </Field>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field htmlFor="cn" label={t("editor.clientName")}>
                    <input id="cn" className="input" autoComplete="name" maxLength={120} value={q.client.name} onChange={(e) => setClient({ name: e.target.value })} />
                  </Field>
                  <Field htmlFor="cp" label={t("editor.clientPhone")}>
                    <input id="cp" className="input" type="tel" autoComplete="tel" maxLength={40} value={q.client.phone} onChange={(e) => setClient({ phone: e.target.value })} />
                  </Field>
                  <Field htmlFor="ce" label={t("editor.clientEmail")}>
                    <input id="ce" className="input" type="email" autoComplete="email" maxLength={160} title={t("editor.clientEmailHint")} placeholder={q.clientId ? "" : "client@exemple.mg"} value={q.client.email ?? ""} disabled={!!q.clientId} onChange={(e) => setClient({ email: e.target.value })} />
                  </Field>
                </div>
                {!q.clientId && <p className="mt-1.5 text-xs text-muted">{t("editor.clientEmailHint")}</p>}
              </div>
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"><span aria-hidden className="h-4 w-1 rounded-full bg-primary" />{t("editor.groupSite")}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field htmlFor="pj" label={t("editor.project")}>
                    <input id="pj" className="input" maxLength={200} value={q.project} onChange={(e) => setQ({ ...q, project: e.target.value })} />
                  </Field>
                  <Field htmlFor="ca" label={t("editor.clientAddress")}>
                    <input id="ca" className="input" maxLength={200} value={q.client.address} onChange={(e) => setClient({ address: e.target.value })} />
                  </Field>
                </div>
              </div>
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"><span aria-hidden className="h-4 w-1 rounded-full bg-primary" />{t("editor.groupTerms")}</h3>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem] lg:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1.4fr)]">
                  <Field htmlFor="dl" label={t("editor.delay")}>
                    <input id="dl" className="input" maxLength={120} placeholder={t("editor.delayPlaceholder")} value={q.delay} onChange={(e) => setQ({ ...q, delay: e.target.value })} />
                  </Field>
                  <Field htmlFor="wr" label={t("svc.warranty")}>
                    <input id="wr" className="input" type="number" inputMode="numeric" min={0} max={240} title={t("svc.warrantyHint")} value={q.warranty ?? ""} onChange={(e) => setQ({ ...q, warranty: e.target.value === "" ? undefined : Math.min(240, Math.max(0, Math.round(Number(e.target.value) || 0))) })} />
                  </Field>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <Field htmlFor="nt" label={t("editor.notes")}>
                      <input id="nt" className="input" maxLength={600} value={q.notes} onChange={(e) => setQ({ ...q, notes: e.target.value })} />
                    </Field>
                  </div>
                </div>
              </div>
            </fieldset>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <Avatar name={q.client.name} src="" size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="truncate text-sm font-semibold">{q.client.name}</span>
                      {(q.clientId || linked) && <span className="inline-flex items-center gap-1 rounded-full bg-ok/15 px-2 py-0.5 text-[11px] font-semibold text-ok"><UserCheck size={11} aria-hidden />{t("editor.clientLinked")}</span>}
                    </p>
                    <p className="flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] text-muted">
                      {q.client.phone && <a href={`tel:${q.client.phone.replace(/[^+\d]/g, "")}`} className="inline-flex items-center gap-1 hover:underline"><Phone size={12} aria-hidden />{q.client.phone}</a>}
                      {q.client.email && <span className="inline-flex items-center gap-1"><Mail size={12} aria-hidden />{q.client.email}</span>}
                    </p>
                  </div>
                </div>
                {!q.project.trim() && !locked && (
                  <button type="button" className="text-[13px] font-medium text-primary hover:underline" onClick={() => setEditClient(true)}>
                    + {t("editor.addSite")}
                  </button>
                )}
                {facts.length > 0 && (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg bg-surface-2/50 px-3 py-2 text-[13px] md:grid-cols-4">
                    {facts.map(([k, v]) => (
                      <div key={k} className="min-w-0">
                        <dt className="text-[11px] uppercase tracking-wide text-muted">{k}</dt>
                        <dd className="truncate font-medium" title={v}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            )}
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

          <ServicesEditor services={q.services ?? []} onChange={(services) => setQ((c) => ({ ...c, services }))} t={t} locked={locked} />

          <fieldset disabled={locked} className="m-0 min-w-0 space-y-6 border-0 p-0">
            <ProfileNeeds lines={validLines} barLen={settings.barLength} kerf={settings.kerf} t={t} />
            {q.clientId && persisted && <ChatButton target={{ client: q.clientId }} label={t("msg.contactClient")} />}
            {q.clientId && persisted && <Timeline quoteId={q.id} />}
          </fieldset>
        </div>

        <SummaryAside
          t={t}
          q={q}
          setQ={setQ}
          totals={{ discount, ht, tva, ttc }}
          margin={validLines.length ? margin : null}
          plan={plan}
          persisted={persisted}
          canAct={canAct}
          locked={locked}
          revisable={revisable}
          mode={mode}
          note={note}
          setNote={setNote}
          attachCut={attachCut}
          setAttachCut={setAttachCut}
          msg={msg}
          settings={settings}
          onNeeds={() => openNeeds()}
          onAct={act}
          onSubmit={submit}
          onNewVersion={newVersion}
        />
      </div>
    </div>
  );
}
