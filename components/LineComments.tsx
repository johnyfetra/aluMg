"use client";
import { MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { mutate } from "swr";
import { request, useLineComments } from "@/lib/client";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";

// Fil de discussion d'un ouvrage précis, partagé par le client et le menuisier. `me` : de quel côté on écrit.
export default function LineComments({ quoteId, lineId, me, canWrite = true }: { quoteId: string; lineId: string; me: "client" | "menuisier"; canWrite?: boolean }) {
  const { t, locale } = useI18n();
  const { data = [] } = useLineComments(quoteId);
  const list = data.filter((c) => c.lineId === lineId);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    setError(false);
    try {
      await request("POST", `/api/quotes/${quoteId}/comments`, { lineId, body: body.trim() });
      setBody("");
      await mutate(`/api/quotes/${quoteId}/comments`);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label={t("cmt.title")} className="space-y-3 rounded-xl border border-line bg-surface-2/50 p-3 sm:p-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold">
        <MessageSquare size={16} aria-hidden className="text-primary" />
        {t("cmt.title")} {list.length > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-on-primary">{list.length}</span>}
      </h4>
      {list.length === 0 ? (
        <p className="text-sm text-muted">{t("cmt.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {list.map((c) => {
            const mine = c.side === me;
            return (
              <li key={c.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "rounded-br-md border border-primary/25 bg-mine text-on-mine" : "rounded-bl-md border border-line bg-surface"}`}>
                  <p className={`mb-0.5 text-[11px] font-semibold ${mine ? "text-on-mine/65" : "text-muted"}`}>
                    {mine ? t("cmt.you") : t(c.side === "client" ? "cmt.client" : "cmt.menuisier")} · {new Date(c.at).toLocaleString(DATE_LOCALE[locale], { dateStyle: "short", timeStyle: "short" })}
                  </p>
                  <p className="whitespace-pre-line break-words">{c.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {canWrite && (
        <form onSubmit={send} className="flex items-end gap-2">
          <label className="sr-only" htmlFor={`cm-${lineId}`}>{t("cmt.placeholder")}</label>
          <textarea id={`cm-${lineId}`} rows={2} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("cmt.placeholder")} className="input min-h-11 flex-1 resize-y" />
          <button type="submit" disabled={busy || !body.trim()} className="btn-primary !px-3" aria-label={t("cmt.send")}>
            <Send size={16} aria-hidden />
          </button>
        </form>
      )}
      {error && <p role="alert" className="text-xs font-medium text-danger">{t("cmt.error")}</p>}
    </section>
  );
}
