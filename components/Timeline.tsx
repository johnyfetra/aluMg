"use client";
import { CheckCheck, CircleDot, FilePlus2, Hammer, MessageSquare, MessageSquareWarning, Pencil, Send, Star, ThumbsDown, ThumbsUp, XCircle } from "lucide-react";
import { useState } from "react";
import { mutate } from "swr";
import { request, useEvents } from "@/lib/client";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";

const ICON = { created: FilePlus2, sent: Send, declined: XCircle, accepted: ThumbsUp, rejected: ThumbsDown, change_requested: MessageSquareWarning, progress: Hammer, completed: CheckCheck, reviewed: Star, message: MessageSquare, revised: Pencil } as const;

// Historique d'un devis (demande, envoi, négociation, avancement, évaluation) et zone de message entre le client et le menuisier.
export default function Timeline({ quoteId, canWrite = true }: { quoteId: string; canWrite?: boolean }) {
  const { t, locale } = useI18n();
  const { data: events = [] } = useEvents(quoteId);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const fmt = (iso: string) => new Date(iso).toLocaleString(DATE_LOCALE[locale], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      await request("POST", `/api/quotes/${quoteId}/actions`, { type: "message", message: text.trim() });
      setText("");
      await mutate(`/api/quotes/${quoteId}/events`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card space-y-4" aria-labelledby="h-tl">
      <h2 id="h-tl" className="text-lg font-semibold">
        {t("tl.title")}
      </h2>
      <ol className="space-y-4">
        {events.map((e) => {
          const Icon = ICON[e.kind as keyof typeof ICON] ?? CircleDot;
          const extra =
            e.kind === "progress" ? ` · ${e.data.progress} %` : e.kind === "change_requested" && e.data.discountPercent ? ` · ${t("tl.discount")} ${e.data.discountPercent} %` : e.kind === "reviewed" ? ` · ${e.data.rating}/5` : "";
          return (
            <li key={e.id} className="flex gap-3">
              <span aria-hidden className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${e.side === "client" ? "bg-c3/15 text-c3" : "bg-primary/12 text-primary"}`}>
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold">{t(e.kind === "revised" ? (e.data.from === "accepted" ? "tl.revisedReopen" : e.data.from === "in_progress" ? "tl.revisedAmend" : "tl.revised") : (`tl.${e.kind}` as "tl.created"))}</span>
                  <span className="text-muted">
                    {extra} — {e.actor} · {fmt(e.at)}
                  </span>
                </p>
                {e.message && <p className="mt-1 whitespace-pre-line rounded-lg bg-surface-2 px-3 py-2 text-sm">{e.message}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      {canWrite && (
        <form onSubmit={send} className="flex gap-2 border-t border-line pt-4">
          <label className="sr-only" htmlFor={`m-${quoteId}`}>
            {t("tl.write")}
          </label>
          <input id={`m-${quoteId}`} className="input" maxLength={1000} placeholder={t("tl.write")} value={text} onChange={(e) => setText(e.target.value)} />
          <button type="submit" className="btn-primary" disabled={busy || !text.trim()}>
            <Send size={16} aria-hidden />
            {t("tl.send")}
          </button>
        </form>
      )}
    </section>
  );
}


