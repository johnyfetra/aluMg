"use client";
import { Send } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { mutate } from "swr";
import { LineCard } from "./quote/LineCard";
import { newLine } from "./quote/line";
import IntakeAssistant from "./IntakeAssistant";
import RecipientsPicker from "./RecipientsPicker";
import { Field } from "./ui";
import { analyze, toLine } from "@/lib/intake";
import { useToast } from "./Toast";
import { normalize } from "@/lib/calc";
import { ApiError, request, useClientQuotes, useConversations, useDirectory } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { DEFAULT_SETTINGS, type Line, lineSchema } from "@/lib/model";

// Formulaire de demande de devis d'un client : il décrit ses ouvrages (sans voir de prix) ; le menuisier répond avec son devis.
export default function RequestForm() {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const preset = useSearchParams().get("menuisier") ?? "";
  const { data: directory = [] } = useDirectory({});
  // les professionnels déjà connus du client (devis reçus, conversations) : choix rapide quand l'annuaire n'est pas ouvert
  const { data: mine = [] } = useClientQuotes();
  const { data: convs = [] } = useConversations();
  const known = [...new Map([
    ...convs.filter((c) => c.other.role === "menuisier").map((c) => [c.other.slug, { slug: c.other.slug, name: c.other.name, logo: c.other.logo, city: "", phone: "" }] as const),
    ...mine.map((c) => [c.menuisier.slug, { slug: c.menuisier.slug, name: c.menuisier.name, logo: c.menuisier.logo, city: c.menuisier.city, phone: c.menuisier.phone }] as const), // les devis reçus donnent lieu et numéro : ils l'emportent
  ].filter(([k]) => !!k)).values()];
  const [slugs, setSlugs] = useState<string[]>(preset ? [preset] : []);
  const [project, setProject] = useState("");
  const [message, setMessage] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [wantedDate, setWantedDate] = useState("");
  // l'ouvrage initial reçoit un identifiant aléatoire : créé après le montage pour que le rendu serveur et client concordent
  const [lines, setLines] = useState<Line[]>([]);
  useEffect(() => {
    const id = setTimeout(() => setLines((cur) => (cur.length ? cur : [newLine(DEFAULT_SETTINGS)])), 0);
    return () => clearTimeout(id);
  }, []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // tant que le client ne détaille pas lui-même ses ouvrages, la demande est préparée à partir de sa description (assistant)
  const [touched, setTouched] = useState(false);
  const described = useMemo(() => (touched ? [] : analyze(`${project}. ${message}`).items), [touched, project, message]);
  const valid = (l: Line) => lineSchema.safeParse(l).success;
  const setLine = (i: number, patch: Partial<Line>) => (setTouched(true), setLines((cur) => cur.map((l, j) => (j === i ? normalize({ ...l, ...patch }) : l))));
  const num = (v: string) => Number(v) || 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slugs.length) return setError(t("req.pickJoiner"));
    if (!described.length && (!lines.length || !lines.every(valid))) return setError(t(message.trim() ? "req.intakeEmpty" : "editor.needLine"));
    setBusy(true);
    setError("");
    // une demande par professionnel (chacun répond par son propre devis, comparables ensuite) ; l'échec d'un envoi n'annule pas les autres
    const body = { project, message, siteAddress, wantedDate, lines: described.length ? [] : lines };
    const results = await Promise.allSettled(slugs.map((menuisier) => request<{ id: string }>("POST", "/api/requests", { menuisier, ...body })));
    const ok = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    const failed = results.flatMap((r, i) => (r.status === "rejected" ? [{ slug: slugs[i], err: r.reason }] : []));
    if (ok.length) await mutate("/api/client/quotes");
    if (!ok.length) {
      const err = failed[0].err;
      setError(err instanceof ApiError && err.code === "no_menuisier" ? t("mp.notFound") : err instanceof ApiError && err.code === "intake_empty" ? t("req.intakeEmpty") : t("common.error"));
      return setBusy(false);
    }
    if (failed.length) toast.warning(t("toast.requestPartial"), `${failed.length} ${t("toast.requestPartialText")}`);
    else toast.success(ok.length > 1 ? `${t("toast.requestSentMany")} · ${ok.length}` : t("toast.requestSent"), t(ok.length > 1 ? "toast.requestSentManyText" : "toast.requestSentText"));
    router.replace(ok.length === 1 ? `/espace-client/devis/${ok[0].id}` : "/espace-client");
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("req.title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">{t("req.hint")}</p>
      </div>

      <section className="card space-y-4" aria-labelledby="h-to">
        <h2 id="h-to" className="text-lg font-semibold">
          {t("req.joiner")}
        </h2>
        <RecipientsPicker value={slugs} onChange={setSlugs} directory={directory} known={known} preset={preset} t={t} />
      </section>

      <section className="card space-y-4" aria-labelledby="h-need">
        <h2 id="h-need" className="text-lg font-semibold">
          {t("req.project")}
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Field htmlFor="rq-p" label={t("editor.project")}>
            <input id="rq-p" className="input" maxLength={200} value={project} onChange={(e) => setProject(e.target.value)} />
          </Field>
          <Field htmlFor="rq-a" label={t("editor.clientAddress")}>
            <input id="rq-a" className="input" maxLength={200} value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} />
          </Field>
          <Field htmlFor="rq-d" label={t("req.wantedDate")}>
            <input id="rq-d" type="date" className="input" value={wantedDate} onChange={(e) => setWantedDate(e.target.value)} />
          </Field>
        </div>
        <Field htmlFor="rq-msg" label={t("req.message")} hint={t("req.messageHint")}>
          <textarea id="rq-msg" className="input min-h-32" maxLength={1500} placeholder={t("req.messagePh")} value={message} onChange={(e) => setMessage(e.target.value)} />
        </Field>
        <IntakeAssistant
          text={`${project}. ${message}`.replace(/^\. /, "")}
          t={t}
          onEdit={(items) => { setTouched(true); setLines(items.map((i) => toLine(i.spec))); }}
          actions={(items) => (
            <>
              <button type="button" className="btn-primary !min-h-10" onClick={() => { setTouched(true); setLines(items.map((i) => toLine(i.spec))); }}>{t("intake.apply")}</button>
              <button type="button" className="btn-secondary !min-h-10" onClick={() => { setTouched(true); setLines((cur) => [...cur, ...items.map((i) => toLine(i.spec))]); }}>{t("intake.add")}</button>
            </>
          )}
        />
      </section>

      <section className="space-y-4" aria-labelledby="h-items">
        <h2 id="h-items" className="text-lg font-semibold">
          {t("editor.lines")}
        </h2>
        {described.length > 0 && <p role="status" className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">{described.length} {t("intake.autoNote")}</p>}
        {lines.map((l, i) => (
          <LineCard
            key={l.id}
            l={l}
            i={i}
            t={t}
            settings={DEFAULT_SETTINGS}
            valid={valid(l)}
            clientMode
            onChange={(p) => setLine(i, p)}
            onRemove={() => (setTouched(true), setLines(lines.filter((_, j) => j !== i)))}
            onDuplicate={() => (setTouched(true), setLines([...lines.slice(0, i + 1), { ...l, id: crypto.randomUUID() }, ...lines.slice(i + 1)]))}
            onNeeds={() => {}}
            num={num}
          />
        ))}
        <button type="button" className="btn-secondary" onClick={() => (setTouched(true), setLines([...lines, newLine(DEFAULT_SETTINGS)]))}>
          + {t("editor.addLine")}
        </button>
      </section>

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary !min-h-12 !px-6" disabled={busy}>
          <Send size={18} aria-hidden />
          {t("req.submit")}
        </button>
        <p className="text-sm text-muted">{t("req.noPrice")}</p>
      </div>
    </form>
  );
}
