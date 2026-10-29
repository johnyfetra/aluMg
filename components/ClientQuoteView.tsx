"use client";
import { LoadingState, ErrorState } from "./Feedback";
import { ArrowLeft, BadgeCheck, CheckCheck, FileText, MessageSquareWarning, Flag, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { mutate } from "swr";
import ChatButton from "./ChatButton";
import ClientDecision from "./ClientDecision";
import QuoteStatusBar from "./QuoteStatusBar";
import { useConfirm } from "./ConfirmDialog";
import { useToast } from "./Toast";
import ClientLineCard from "./ClientLineCard";
import Timeline from "./Timeline";
import { Avatar, Field, Progress, StarInput, StatusBadge } from "./ui";
import { fmt } from "@/lib/calc";
import { serviceTotal } from "@/lib/totals";
import { ApiError, request, useClientQuote } from "@/lib/client";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import { REPORT_REASONS, lineMarks } from "@/lib/model";
import { MVP } from "@/lib/mvp";
import { totals } from "@/lib/totals";
import Select from "./Select";

const STEPS = ["requested", "sent", "accepted", "in_progress", "completed"] as const;
const stepOf = (s: string) => (s === "draft" ? 0 : s === "negotiation" ? 1 : Math.max(0, STEPS.indexOf(s as (typeof STEPS)[number])));

// Suivi d'un devis côté client : état, devis reçu, décisions (accepter, refuser, demander une modification ou une remise), avancement, évaluation, signalement.
export default function ClientQuoteView({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const { data, isLoading, error, mutate: reload } = useClientQuote(id);
  const [panel, setPanel] = useState<null | "change" | "reject" | "report">(null);
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>("quality");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const ask = useConfirm();
  // lien profond d'une notification : ?ligne=<ouvrage>
  const [focus] = useState(() => (typeof location === "undefined" ? null : new URLSearchParams(location.search).get("ligne")));

  if (error) return <ErrorState retry={() => { void reload(); }} />;
  if (isLoading) return <LoadingState />;
  if (!data) {
    return (
      <p className="card">
        {t("editor.notFound")}{" "}
        <Link href="/espace-client" className="text-primary underline">
          {t("common.back")}
        </Link>
      </p>
    );
  }
  const { quote: q, menuisier: m, reviewed } = data;
  const priced = q.status !== "requested" && q.status !== "draft";
  const tot = totals(q);
  const cur = t("common.currency");
  const step = stepOf(q.status);
  const rejected = q.status === "rejected";
  const marks = lineMarks(q.lines);

  const act = async (body: Record<string, unknown>, ok: string): Promise<boolean> => {
    setBusy(true);
    setMsg(null);
    try {
      // la décision porte sur la révision affichée : si le menuisier a modifié le devis entre-temps, elle est refusée
      await request("POST", `/api/quotes/${id}/actions`, ["accept", "reject", "request_change", "review_line", "approve_all"].includes(String(body.type)) ? { ...body, rev: q.rev ?? 0 } : body);
      await Promise.all([mutate(`/api/client/quotes/${id}`), mutate(`/api/quotes/${id}/comments`), mutate(`/api/quotes/${id}/events`), mutate("/api/client/quotes")]);
      setMsg(null);
      toast.success(ok, t(`toast.text.${String(body.type)}` as "toast.text.accept"));
      setPanel(null);
      setMessage("");
      return true;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError && e.code === "quote_changed" ? t("act.changed") : e instanceof ApiError && e.code === "invalid_transition" ? t("act.invalid") : e instanceof ApiError && e.code === "already_reviewed" ? t("act.alreadyReviewed") : e instanceof ApiError && e.code === "nothing_to_accept" ? t("act.nothingToAccept") : t("common.error") });
      toast.error(t("toast.errorTitle"), e instanceof ApiError && e.code === "quote_changed" ? t("act.changed") : t("toast.errorText"));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const steps = ["requested", "sent", "accepted", "in_progress", "completed"] as const;
  // avis par ouvrage : validés / demandes à envoyer (regroupées en une seule demande de modification)
  const reviews = q.lineReviews ?? {};
  const approved = q.lines.filter((l) => reviews[l.id]?.state === "approved").length;
  const held = q.lines.filter((l) => reviews[l.id]?.state === "hold");
  const kept = totals({ ...q, status: "accepted" }); // total si les ouvrages en attente sont mis de côté
  const requests = q.lines.filter((l) => reviews[l.id]?.state === "request");
  const sendRequests = () => {
    const topics = new Set(requests.map((l) => reviews[l.id].topic ?? "details"));
    const text = requests.map((l) => `${marks[q.lines.indexOf(l)]} — ${t(`act.topic.${reviews[l.id].topic ?? "details"}`)} : ${reviews[l.id].message}`).join("\n");
    return act({ type: "request_change", topic: topics.size === 1 ? [...topics][0] : "details", message: text }, t("act.changeSent"));
  };

  return (
    <div className="space-y-6">
      <Link href="/espace-client" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        <ArrowLeft size={16} aria-hidden />
        {t("cl.myRequests")}
      </Link>

      <QuoteStatusBar quote={q} total={priced ? tot.ttc : null} side="client" />

      {(q.rev ?? 0) > 0 && (q.status === "sent" || q.status === "in_progress") && (
        <p role="status" className="rounded-xl border border-warn/50 bg-warn/10 px-4 py-3 text-sm font-medium">
          {t(q.status === "sent" ? "cl.upd.sent" : "cl.upd.in_progress")} ({t("editor.revision")} {q.rev})
        </p>
      )}

      <header className="card space-y-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={m.name} src={m.logo} size={64} />
          <Link href={`/espace-client/devis/${q.id}/apercu`} className="btn-primary order-last w-full sm:ml-auto sm:w-auto">
            <FileText size={18} aria-hidden />
            {t("preview.full")}
          </Link>
          <div className="min-w-0 flex-1 basis-52">
            <h1 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xl font-bold sm:text-2xl">
              {q.number}
              {(q.rev ?? 0) > 0 && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">{t("editor.revision")} {q.rev}</span>}
              <StatusBadge status={q.status} label={t(`cstatus.${q.status}`)} />
            </h1>
            <p className="text-muted">
              {q.project && <>{q.project} · </>}
              {new Date(q.date).toLocaleDateString(DATE_LOCALE[locale])}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {m.slug && !MVP ? (
                <Link href={`/menuisiers/${m.slug}`} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                  {m.name}
                  {m.verified && <BadgeCheck size={14} aria-label={t("dir.verified")} />}
                </Link>
              ) : (
                <span className="font-semibold">{m.name}</span>
              )}
              {m.phone && (
                <a href={`tel:${m.phone.replace(/[^+\d]/g, "")}`} className="inline-flex items-center gap-1 hover:underline">
                  <Phone size={14} aria-hidden />
                  {m.phone}
                </a>
              )}
              {m.email && (
                <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1 hover:underline">
                  <Mail size={14} aria-hidden />
                  {m.email}
                </a>
              )}
            </p>
          </div>
        </div>

        {!rejected && (
          <ol className="grid grid-cols-5 gap-1" aria-label={t("cl.steps")}>
            {steps.map((s, i) => (
              <li key={s} aria-current={i === step ? "step" : undefined} className="space-y-1.5 text-center">
                <span className={`mx-auto block h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-surface-2"}`} />
                <span className={`block text-[11px] leading-tight sm:text-xs ${i === step ? "font-semibold text-ink" : "text-muted"}`}>{t(`cl.step.${s}`)}</span>
              </li>
            ))}
          </ol>
        )}
        {(q.status === "accepted" || q.status === "in_progress" || q.status === "completed") && <Progress value={q.progress} label={t("sites.progress")} />}
        {q.status === "requested" || q.status === "draft" ? <p className="rounded-lg bg-surface-2 p-3 text-sm text-muted">{t("cl.waitingQuote")}</p> : null}
        {q.status === "negotiation" && <p className="rounded-lg bg-warn/10 p-3 text-sm">{t("cl.waitingAnswer")}</p>}
      </header>

      <p role="status" className={`text-sm font-medium ${msg?.ok ? "text-ok" : "text-danger"}`}>
        {msg?.text}
      </p>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-6">
          <section className="card space-y-4" aria-labelledby="h-lines">
            <h2 id="h-lines" className="text-lg font-semibold">
              {t("editor.lines")}
            </h2>
            {priced && (
              <div className="space-y-2 rounded-xl border border-line bg-surface-2/40 p-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <p className="text-sm font-semibold">
                    {approved}/{q.lines.length} {t("line.validatedCount")}{held.length > 0 ? ` · ${held.length} ${t("line.onHoldCount")}` : ""}
                  </p>
                  <div className="h-1.5 min-w-20 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                    <span className="block h-full rounded-full bg-good transition-[width]" style={{ width: `${(approved / q.lines.length) * 100}%` }} />
                  </div>
                  {q.status === "sent" && approved + held.length < q.lines.length && (
                    <button type="button" className="btn-primary !min-h-9 !px-3 text-xs" disabled={busy} onClick={async () => (await ask({ message: t("line.confirmAll"), confirmLabel: t("line.approveAll") })) && act({ type: "approve_all" }, t("toast.allApproved"))}>
                      <CheckCheck size={14} aria-hidden />
                      {t("line.approveAll")}
                    </button>
                  )}
                </div>
                {held.length > 0 && q.status === "sent" && (
                  <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm">{t("line.keptTotal")} : <strong className="tabular-nums">{fmt(kept.ttc)} {cur}</strong> <span className="text-muted">({t("line.keptNote")})</span></p>
                )}
                {requests.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg bg-warn/10 px-3 py-2">
                    <p className="min-w-0 flex-1 text-sm">{requests.length} {t("line.requestsPending")}</p>
                    {q.status === "sent" && (
                      <button type="button" className="btn-secondary !min-h-9 !px-3 text-xs" disabled={busy} onClick={sendRequests}>
                        <MessageSquareWarning size={14} aria-hidden />
                        {t("line.sendAll")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            <ul className="space-y-4">
              {q.lines.map((l, i) => (
                <ClientLineCard
                  key={l.id}
                  quoteId={q.id}
                  line={l}
                  index={i}
                  mark={marks[i]}
                  priced={priced}
                  focused={focus === l.id}
                  canComment={priced}
                  review={q.lineReviews?.[l.id]}
                  canReview={q.status === "sent"}
                  busy={busy}
                  onReview={(b) => act({ type: "review_line", lineId: l.id, ...b }, t(b.state === "approved" ? "toast.lineApproved" : b.state === "request" ? "toast.lineRequest" : b.state === "hold" ? "toast.lineHold" : "toast.lineCleared"))}
                />
              ))}
            </ul>
          </section>

          {priced && (q.services?.length ?? 0) > 0 && (
            <section className="card space-y-3" aria-labelledby="h-svc">
              <h2 id="h-svc" className="text-lg font-semibold">{t("svc.client")}</h2>
              <ul className="divide-y divide-line text-sm">
                {q.services!.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2 first:pt-0 last:pb-0">
                    <span className="font-medium">{v.label || t(`svc.${v.kind}`)}</span>
                    <span className="text-muted tabular-nums">{v.qty} × {fmt(v.price)} {cur} = <strong className="text-ink">{fmt(serviceTotal(v))} {cur}</strong></span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {q.request?.message && (
            <section className="card" aria-labelledby="h-msg">
              <h2 id="h-msg" className="mb-2 text-lg font-semibold">
                {t("cl.yourRequest")}
              </h2>
              <p className="whitespace-pre-line text-sm text-muted">{q.request.message}</p>
            </section>
          )}

          <Timeline quoteId={id} />
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20">
          {<ChatButton target={{ menuisierId: m.id }} label={t("msg.contactJoiner")} />}
          {priced && (
            <section className="card space-y-2" aria-label={t("editor.totalTtc")}>
              {tot.discount > 0 && (
                <>
                  <p className="flex justify-between text-sm">
                    <span className="text-muted">{t("pdf.subtotal")}</span>
                    <span>{fmt(tot.gross)} {cur}</span>
                  </p>
                  <p className="flex justify-between text-sm">
                    <span className="text-muted">{t("pdf.discount")} {q.discount} %</span>
                    <span>− {fmt(tot.discount)} {cur}</span>
                  </p>
                </>
              )}
              <p className="flex justify-between text-sm">
                <span className="text-muted">{t("editor.totalHt")}</span>
                <span>{fmt(tot.ht)} {cur}</span>
              </p>
              {q.terms.tva > 0 && (
                <p className="flex justify-between text-sm">
                  <span className="text-muted">{t("editor.totalTva")} {q.terms.tva} %</span>
                  <span>{fmt(tot.tva)} {cur}</span>
                </p>
              )}
              <p className="flex items-baseline justify-between border-t border-line pt-2">
                <span className="font-semibold">{t("editor.totalTtc")}</span>
                <span className="text-2xl font-bold text-primary">{fmt(tot.ttc)} <span className="text-sm">{cur}</span></span>
              </p>
              <p className="text-xs text-muted">
                {t("pdf.deposit")} : {q.terms.deposit} % ({fmt(Math.round((tot.ttc * q.terms.deposit) / 100))} {cur}) · {t("pdf.validUntil")} {new Date(new Date(q.date).getTime() + q.terms.validityDays * 864e5).toLocaleDateString(DATE_LOCALE[locale])}
              </p>
              {q.delay && <p className="text-xs text-muted">{t("pdf.delay")} : {q.delay}</p>}
              {(q.warranty ?? 0) > 0 && <p className="text-xs text-muted">{t("svc.warrantyLine")} : {q.warranty} {t("svc.months")}</p>}
              {q.notes && <p className="text-xs text-muted">{q.notes}</p>}
            </section>
          )}

          <ClientDecision q={q} busy={busy} pending={requests.length} act={act} t={t} />

          {q.status === "completed" && (
            <section className="card space-y-3" aria-labelledby="h-rev">
              <h2 id="h-rev" className="font-semibold">
                {t("act.review")}
              </h2>
              {reviewed ? (
                <p className="text-sm text-ok">{t("act.thanks")}</p>
              ) : (
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (rating) act({ type: "review", rating, comment }, t("act.reviewSent"));
                  }}
                >
                  <p className="text-sm text-muted">{t("act.reviewHint")}</p>
                  <StarInput value={rating} onChange={setRating} label={t("act.rating")} />
                  <Field htmlFor="rv-c" label={t("act.comment")}>
                    <textarea id="rv-c" className="input min-h-24" maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
                  </Field>
                  <button type="submit" className="btn-primary w-full" disabled={busy || rating === 0}>
                    {t("act.publish")}
                  </button>
                </form>
              )}
            </section>
          )}

          <section className="card space-y-3">
            <button type="button" className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-danger" onClick={() => setPanel(panel === "report" ? null : "report")} aria-expanded={panel === "report"}>
              <Flag size={14} aria-hidden />
              {t("act.report")}
            </button>
            {panel === "report" && (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  act({ type: "report", reason, details: message }, t("act.reported"));
                }}
              >
                <p className="text-xs text-muted">{t("act.reportHint")}</p>
                <Field htmlFor="rp-r" label={t("act.reportReason")}>
                  <Select id="rp-r" value={reason} onChange={(v) => setReason(v as typeof reason)} options={REPORT_REASONS.map((r) => ({ value: r, label: t(`rp.${r}`) }))} />
                </Field>
                <Field htmlFor="rp-d" label={t("act.reportDetails")}>
                  <textarea id="rp-d" className="input min-h-20" maxLength={1500} value={message} onChange={(e) => setMessage(e.target.value)} />
                </Field>
                <button type="submit" className="btn-danger w-full" disabled={busy}>
                  {t("act.report")}
                </button>
              </form>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
