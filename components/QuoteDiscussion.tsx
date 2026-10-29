"use client";
import { MessagesSquare, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { mutate } from "swr";
import { useToast } from "./Toast";
import { request, useEvents } from "@/lib/client";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";

// Discussion propre à un devis : tout ce que le client et le menuisier s'écrivent à son sujet, avec l'historique, au même endroit que le devis.
// (La messagerie générale reste pour le reste ; les remarques précises sur un ouvrage vivent sur l'ouvrage.)
export default function QuoteDiscussion({ quoteId, me, canWrite = true }: { quoteId: string; me: "client" | "menuisier"; canWrite?: boolean }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const { data: events = [] } = useEvents(quoteId, true);
  const list = events.filter((e) => e.kind === "message");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const count = useRef(list.length);

  // défile en bas quand un message arrive (sans voler le défilement de la page)
  useEffect(() => {
    if (list.length !== count.current && box.current) box.current.scrollTop = box.current.scrollHeight;
    count.current = list.length;
  }, [list.length]);
  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, []);
  // le champ suit le texte (une à six lignes)
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [text]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      await request("POST", `/api/quotes/${quoteId}/actions`, { type: "message", message: body });
      setText("");
      await mutate(`/api/quotes/${quoteId}/events`);
    } catch {
      toast.error(t("toast.errorTitle"), t("toast.errorText"));
    } finally {
      setBusy(false);
    }
  };
  const day = (iso: string) => new Date(iso).toLocaleDateString(DATE_LOCALE[locale], { weekday: "long", day: "numeric", month: "long" });
  const hour = (iso: string) => new Date(iso).toLocaleTimeString(DATE_LOCALE[locale], { hour: "2-digit", minute: "2-digit" });

  return (
    <section className="card !p-0" aria-labelledby="h-disc">
      <h2 id="h-disc" className="flex items-center gap-2 border-b border-line px-4 py-3 text-lg font-semibold sm:px-6">
        <MessagesSquare size={18} aria-hidden className="text-primary" />
        {t("disc.title")}
        {list.length > 0 && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">{list.length}</span>}
      </h2>
      <div ref={box} role="log" aria-live="polite" aria-label={t("disc.title")} className="max-h-96 min-h-32 space-y-1.5 overflow-y-auto bg-surface-2/40 px-4 py-4 sm:px-6">
        {list.length === 0 && <p className="py-6 text-center text-sm text-muted">{t("disc.empty")}</p>}
        {list.map((m, i) => {
          const mine = m.side === me;
          const newDay = i === 0 || day(list[i - 1].at) !== day(m.at);
          return (
            <div key={m.id}>
              {newDay && <p className="my-3 text-center text-xs capitalize text-muted">{day(m.at)}</p>}
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${mine ? "rounded-br-md bg-mine text-on-mine" : "rounded-bl-md border border-line bg-surface"}`}>
                  {!mine && <p className="text-xs font-semibold text-primary">{m.actor}</p>}
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.message}</p>
                  <p className="mt-0.5 text-right text-[11px] opacity-60">{hour(m.at)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {canWrite && (
        <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3 sm:px-6">
          <label className="sr-only" htmlFor={`disc-${quoteId}`}>{t("disc.write")}</label>
          <textarea
            ref={input}
            id={`disc-${quoteId}`}
            rows={1}
            maxLength={1000}
            placeholder={t("disc.write")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}
            className="input max-h-36 min-h-11 flex-1 resize-none overflow-y-auto rounded-2xl text-base sm:text-sm"
          />
          <button type="submit" className="btn-primary !min-h-11 !rounded-full !px-4" disabled={busy || !text.trim()} aria-label={t("tl.send")}>
            <Send size={16} aria-hidden />
            <span className="max-sm:sr-only">{t("tl.send")}</span>
          </button>
        </form>
      )}
    </section>
  );
}
