"use client";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { mutate } from "swr";
import { Avatar } from "./ui";
import { request, useConversations, useMessages } from "@/lib/client";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import type { ConversationView, MessageView } from "@/lib/chat";

// Messagerie : liste des conversations à gauche, fil à droite (un seul volet à la fois sur mobile).
export default function Messenger() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const selected = useSearchParams().get("c");
  const { data: convs = [], isLoading } = useConversations();
  const current = convs.find((c) => c.id === selected) ?? null;
  const time = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    return d.toDateString() === today.toDateString() ? d.toLocaleTimeString(DATE_LOCALE[locale], { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString(DATE_LOCALE[locale], { day: "numeric", month: "short" });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("msg.title")}</h1>
      <div className="grid h-[calc(100vh-11rem)] min-h-[34rem] overflow-hidden rounded-2xl border border-line bg-surface shadow-sm lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className={`min-h-0 flex-col border-r border-line ${current ? "hidden lg:flex" : "flex"}`} aria-label={t("msg.conversations")}>
          <div className="border-b border-line px-4 py-3 text-sm font-semibold">{t("msg.conversations")}</div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {!isLoading && convs.length === 0 && <li className="p-6 text-center text-sm text-muted">{t("msg.empty")}</li>}
            {convs.map((c) => (
              <li key={c.id}>
                <button type="button" aria-current={c.id === selected ? "true" : undefined} onClick={() => router.replace(`/messages?c=${c.id}`)} className={`flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition-colors hover:bg-surface-2 ${c.id === selected ? "bg-primary/10" : ""}`}>
                  <Avatar name={c.other.name} src={c.other.role === "menuisier" ? c.other.logo || c.other.avatar : c.other.avatar} size={44} round={c.other.role === "client"} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-sm ${c.unread ? "font-bold" : "font-semibold"}`}>{c.other.name}</span>
                      {c.last && <span className="shrink-0 text-[11px] text-muted">{time(c.last.at)}</span>}
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${c.unread ? "font-medium text-ink" : "text-muted"}`}>{c.last ? `${c.last.mine ? `${t("msg.you")} : ` : ""}${c.last.body}` : t("msg.noMessage")}</span>
                      {c.unread > 0 && (
                        <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-on-primary" aria-label={`${c.unread} ${t("msg.unread")}`}>
                          {c.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className={`min-h-0 min-w-0 flex-col ${current ? "flex" : "hidden lg:flex"}`} aria-label={t("msg.thread")}>
          {current ? <Thread key={current.id} conv={current} onBack={() => router.replace("/messages")} /> : (
            <div className="grid flex-1 place-items-center p-8 text-center text-muted">
              <div>
                <MessageCircle size={40} aria-hidden className="mx-auto mb-3 opacity-40" />
                <p>{t("msg.pick")}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Thread({ conv, onBack }: { conv: ConversationView; onBack: () => void }) {
  const { t, locale } = useI18n();
  const { data: msgs = [] } = useMessages(conv.id);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const count = useRef(0);

  // lire un fil change le compteur de non-lus de la navigation
  useEffect(() => {
    if (msgs.length) void Promise.all([mutate("/api/messages/unread"), mutate("/api/conversations")]);
  }, [msgs.length]);

  // défilement vers le bas à l'ouverture et quand un message arrive, sauf si on relit plus haut
  useEffect(() => {
    const b = box.current;
    if (!b) return;
    const near = b.scrollHeight - b.scrollTop - b.clientHeight < 160;
    if (count.current === 0 || near) end.current?.scrollIntoView({ block: "end" });
    count.current = msgs.length;
  }, [msgs.length]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      const m = await request<MessageView>("POST", `/api/conversations/${conv.id}/messages`, { body });
      await mutate(`/api/conversations/${conv.id}/messages`, [...msgs, m], { revalidate: true });
      await mutate("/api/conversations");
      setText("");
      end.current?.scrollIntoView({ block: "end" });
    } catch {
      setError(t("common.error"));
    } finally {
      setSending(false);
    }
  };

  const day = (iso: string) => new Date(iso).toLocaleDateString(DATE_LOCALE[locale], { weekday: "long", day: "numeric", month: "long" });
  const hour = (iso: string) => new Date(iso).toLocaleTimeString(DATE_LOCALE[locale], { hour: "2-digit", minute: "2-digit" });
  const o = conv.other;

  return (
    <>
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button type="button" className="grid size-10 place-items-center rounded-lg hover:bg-surface-2 lg:hidden" onClick={onBack} aria-label={t("common.back")}>
          <ArrowLeft size={18} aria-hidden />
        </button>
        <Avatar name={o.name} src={o.role === "menuisier" ? o.logo || o.avatar : o.avatar} size={40} round={o.role === "client"} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{o.name}</p>
          <p className="text-xs text-muted">{o.role === "menuisier" ? t("msg.joiner") : t("msg.client")}</p>
        </div>
        {o.role === "menuisier" && o.slug && (
          <Link href={`/menuisiers/${o.slug}`} className="text-sm font-medium text-primary hover:underline">
            {t("dir.viewProfile")}
          </Link>
        )}
      </header>

      <div ref={box} className="min-h-0 flex-1 space-y-1 overflow-y-auto bg-surface-2/40 px-4 py-4" role="log" aria-live="polite" aria-label={t("msg.thread")}>
        {msgs.length === 0 && <p className="py-10 text-center text-sm text-muted">{t("msg.startHint")}</p>}
        {msgs.map((m, i) => {
          const newDay = i === 0 || new Date(msgs[i - 1].at).toDateString() !== new Date(m.at).toDateString();
          return (
            <div key={m.id}>
              {newDay && <p className="my-3 text-center text-xs font-medium capitalize text-muted">{day(m.at)}</p>}
              <div className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${m.mine ? "rounded-br-md bg-primary text-on-primary" : "rounded-bl-md border border-line bg-surface"}`}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-0.5 text-right text-[10px] ${m.mine ? "text-on-primary/70" : "text-muted"}`}>{hour(m.at)}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>

      <form onSubmit={send} className="border-t border-line p-3">
        {error && (
          <p role="alert" className="mb-2 text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <div className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            {t("msg.write")}
          </label>
          <textarea
            id="chat-input"
            rows={1}
            maxLength={2000}
            value={text}
            placeholder={t("msg.write")}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send();
              }
            }}
            className="input max-h-36 min-h-11 flex-1 resize-none"
          />
          <button type="submit" className="btn-primary !min-h-11" disabled={sending || !text.trim()}>
            <Send size={16} aria-hidden />
            <span className="hidden sm:inline">{t("tl.send")}</span>
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted">{t("msg.hint")}</p>
      </form>
    </>
  );
}
