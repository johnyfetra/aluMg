"use client";
import { ArrowLeft, BadgeCheck, Flag, Mail, MessageSquareWarning, Phone, ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { mutate } from "swr";
import Timeline from "./Timeline";
import { Avatar, Field, Progress, StarInput, StatusBadge } from "./ui";
import { fmt, lineTotal } from "@/lib/calc";
import { ApiError, request, useClientQuote } from "@/lib/client";
import { lineDetails, lineTitle } from "@/lib/describe";
import { drawingSvg } from "@/lib/drawing";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import { REPORT_REASONS } from "@/lib/model";
import { totals } from "@/lib/totals";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const STEPS = ["requested", "sent", "accepted", "in_progress", "completed"] as const;
const stepOf = (s: string) => (s === "draft" ? 0 : s === "negotiation" ? 1 : Math.max(0, STEPS.indexOf(s as (typeof STEPS)[number])));

// Suivi d'un devis côté client : état, devis reçu, décisions (accepter, refuser, demander une modification ou une remise), avancement, évaluation, signalement.
export default function ClientQuoteView({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const { data, isLoading } = useClientQuote(id);
  const [panel, setPanel] = useState<null | "change" | "reject" | "report">(null);
  const [message, setMessage] = useState("");
  const [discount, setDiscount] = useState("");
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>("quality");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (isLoading) return null;
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

  const act = async (body: Record<string, unknown>, ok: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await request("POST", `/api/quotes/${id}/actions`, body);
      await Promise.all([mutate(`/api/client/quotes/${id}`), mutate(`/api/quotes/${id}/events`), mutate("/api/client/quotes")]);
      setMsg({ ok: true, text: ok });
      setPanel(null);
      setMessage("");
      setDiscount("");
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError && e.code === "invalid_transition" ? t("act.invalid") : e instanceof ApiError && e.code === "already_reviewed" ? t("act.alreadyReviewed") : t("common.error") });
    } finally {
      setBusy(false);
    }
  };

  const steps = ["requested", "sent", "accepted", "in_progress", "completed"] as const;

  return (
    <div className="space-y-6">
      <Link href="/espace-client" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        <ArrowLeft size={16} aria-hidden />
        {t("cl.myRequests")}
      </Link>

      <header className="card space-y-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={m.name} src={m.logo} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
              {q.number}
              <StatusBadge status={q.status} label={t(`cstatus.${q.status}`)} />
            </h1>
            <p className="text-muted">
              {q.project && <>{q.project} · </>}
              {new Date(q.date).toLocaleDateString(DATE_LOCALE[locale])}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {m.slug ? (
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
            <ul className="divide-y divide-line">
              {q.lines.map((l, i) => (
                <li key={l.id} className="grid gap-4 py-4 first:pt-0 last:pb-0 sm:grid-cols-[11rem_1fr_auto]">
                  <div role="img" aria-label={lineTitle(l, t)} className="rounded-lg bg-white p-2" dangerouslySetInnerHTML={{ __html: drawingSvg(l, `c${i}`, 220, 160).svg }} />
                  <div>
                    <p className="font-semibold">
                      {i + 1}. {cap(lineTitle(l, t))}
                    </p>
                    <p className="text-sm text-muted">
                      {l.width} × {l.height} {t("common.mm")} · ×{l.qty}
                    </p>
                    <ul className="mt-1 space-y-0.5 text-sm text-muted">
                      {lineDetails(l, t).map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                  {priced && (
                    <div className="text-right text-sm">
                      <p className="text-muted">
                        {fmt(l.unit)} {cur} × {l.qty}
                      </p>
                      <p className="text-base font-bold">
                        {fmt(lineTotal(l))} {cur}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

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
              {q.notes && <p className="text-xs text-muted">{q.notes}</p>}
            </section>
          )}

          {q.status === "sent" && (
            <section className="card space-y-3" aria-labelledby="h-dec">
              <h2 id="h-dec" className="font-semibold">
                {t("act.decide")}
              </h2>
              <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => confirm(t("act.confirmAccept")) && act({ type: "accept" }, t("act.accepted"))}>
                <ThumbsUp size={16} aria-hidden />
                {t("act.accept")}
              </button>
              <button type="button" className="btn-secondary w-full" onClick={() => setPanel(panel === "change" ? null : "change")} aria-expanded={panel === "change"}>
                <MessageSquareWarning size={16} aria-hidden />
                {t("act.requestChange")}
              </button>
              <button type="button" className="btn-danger w-full" onClick={() => setPanel(panel === "reject" ? null : "reject")} aria-expanded={panel === "reject"}>
                <ThumbsDown size={16} aria-hidden />
                {t("act.reject")}
              </button>
            </section>
          )}
          {q.status === "negotiation" && (
            <button type="button" className="btn-danger w-full" onClick={() => setPanel(panel === "reject" ? null : "reject")} aria-expanded={panel === "reject"}>
              <ThumbsDown size={16} aria-hidden />
              {t("act.reject")}
            </button>
          )}

          {panel === "change" && (
            <form
              className="card space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                act({ type: "request_change", message, ...(Number(discount) > 0 ? { discountPercent: Number(discount) } : {}) }, t("act.changeSent"));
              }}
            >
              <Field htmlFor="ch-msg" label={t("act.changeMessage")} hint={t("act.changeHint")}>
                <textarea id="ch-msg" className="input min-h-24" required maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
              </Field>
              <Field htmlFor="ch-disc" label={t("act.discount")}>
                <input id="ch-disc" type="number" inputMode="decimal" min={0} max={90} className="input" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </Field>
              <button type="submit" className="btn-primary w-full" disabled={busy || !message.trim()}>
                {t("act.send")}
              </button>
            </form>
          )}
          {panel === "reject" && (
            <form
              className="card space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                act({ type: "reject", ...(message.trim() ? { message: message.trim() } : {}) }, t("act.rejected"));
              }}
            >
              <Field htmlFor="rj-msg" label={t("act.rejectReason")}>
                <textarea id="rj-msg" className="input min-h-20" maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
              </Field>
              <button type="submit" className="btn-danger w-full" disabled={busy}>
                {t("act.reject")}
              </button>
            </form>
          )}

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
                  <select id="rp-r" className="input" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
                    {REPORT_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {t(`rp.${r}`)}
                      </option>
                    ))}
                  </select>
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
