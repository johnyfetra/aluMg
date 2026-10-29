"use client";
import { BadgeDollarSign, CheckCircle2, CircleHelp, ListChecks, MessageSquareWarning, ThumbsUp } from "lucide-react";
import { useState } from "react";
import type { T } from "@/lib/i18n";
import { CHANGE_TOPICS, type ChangeTopic, type LineReview } from "@/lib/model";

const ICON = { price: BadgeDollarSign, details: ListChecks, info: CircleHelp } as const;
export type ReviewBody = { state: "approved" | "request" | "clear"; topic?: ChangeTopic; message?: string };

// Décision du client sur UN ouvrage : le valider (avec un avis facultatif) ou faire une demande précise (objet + texte). Lecture seule hors devis « envoyé ».
export default function LineDecision({ review, canReview, onReview, busy, t }: { review?: LineReview; canReview: boolean; onReview: (b: ReviewBody) => Promise<boolean>; busy: boolean; t: T }) {
  const [form, setForm] = useState<null | "approved" | "request">(null);
  const [topic, setTopic] = useState<ChangeTopic>(review?.topic ?? "details");
  const [text, setText] = useState(review?.message ?? "");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await onReview({ state: form!, ...(form === "request" ? { topic } : {}), message: text.trim() })) setForm(null);
  };
  const open = (f: "approved" | "request") => {
    setText(review?.state === f ? review.message : "");
    setTopic(review?.topic ?? "details");
    setForm(f);
  };

  return (
    <div className="space-y-2 border-t border-line px-4 py-3 sm:px-5" role="group" aria-label={t("line.decision")}>
      <div className="flex flex-wrap items-center gap-2">
        {review?.state === "approved" && <span className="inline-flex items-center gap-1.5 rounded-full bg-good/15 px-2.5 py-1 text-xs font-semibold text-ok"><CheckCircle2 size={14} aria-hidden />{t("line.approved")}</span>}
        {review?.state === "request" && <span className="inline-flex items-center gap-1.5 rounded-full bg-warn/15 px-2.5 py-1 text-xs font-semibold text-warn"><MessageSquareWarning size={14} aria-hidden />{t("line.requested")}{review.topic ? ` · ${t(`act.topic.${review.topic}`)}` : ""}</span>}
        {!review && <span className="text-xs text-muted">{t("line.pending")}</span>}
        {canReview && form === null && (
          <span className="ml-auto flex flex-wrap gap-2">
            {review?.state !== "approved" && <button type="button" className="btn-primary !min-h-9 !px-3 text-xs" disabled={busy} onClick={() => onReview({ state: "approved" })}><ThumbsUp size={14} aria-hidden />{t("line.approve")}</button>}
            <button type="button" className="btn-secondary !min-h-9 !px-3 text-xs" onClick={() => open(review?.state === "approved" ? "approved" : "request")}>
              {review?.state === "approved" ? t("line.addOpinion") : <><MessageSquareWarning size={14} aria-hidden />{review?.state === "request" ? t("line.editRequest") : t("line.ask")}</>}
            </button>
            {review?.state === "approved" && <button type="button" className="btn-secondary !min-h-9 !px-3 text-xs" onClick={() => open("request")}>{t("line.ask")}</button>}
            {review && <button type="button" className="btn-ghost !min-h-9 !px-3 text-xs" disabled={busy} onClick={() => onReview({ state: "clear" })}>{t("line.withdraw")}</button>}
          </span>
        )}
      </div>
      {review?.message && form === null && <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm">{review.message}</p>}

      {canReview && form !== null && (
        <form onSubmit={submit} className="space-y-3 rounded-xl border border-line bg-surface-2/50 p-3">
          {form === "request" && (
            <div role="radiogroup" aria-label={t("act.topicLabel")} className="flex flex-wrap gap-2">
              {CHANGE_TOPICS.map((id) => {
                const Icon = ICON[id];
                return (
                  <button key={id} type="button" role="radio" aria-checked={topic === id} onClick={() => setTopic(id)} className={`flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold ${topic === id ? "border-primary bg-primary/10 text-primary" : "border-line text-muted hover:bg-surface"}`}>
                    <Icon size={14} aria-hidden />{t(`act.topic.${id}`)}
                  </button>
                );
              })}
            </div>
          )}
          <label className="block space-y-1 text-xs font-medium text-muted">
            {form === "request" ? t("line.requestLabel") : t("line.opinionLabel")}
            <textarea className="input min-h-20 text-base text-ink sm:text-sm" maxLength={1000} required={form === "request"} placeholder={t(form === "request" ? `act.ph.${topic}` : "line.opinionPh")} value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary !min-h-9 !px-4 text-xs" disabled={busy || (form === "request" && !text.trim())}>{form === "request" ? t("line.sendRequest") : t("line.saveApproval")}</button>
            <button type="button" className="btn-secondary !min-h-9 !px-4 text-xs" onClick={() => setForm(null)}>{t("msg.cancel")}</button>
          </div>
        </form>
      )}
    </div>
  );
}
