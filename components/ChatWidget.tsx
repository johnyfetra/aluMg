"use client";
import { ArrowLeft, ExternalLink, MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Thread from "./ChatThread";
import ConversationList from "./ConversationList";
import { Avatar } from "./ui";
import { useConversations, useSession, useUnread } from "@/lib/client";
import { useI18n } from "@/lib/i18n";

const KEY = "alumg.chat";
const read = (): { open: boolean; id: string | null } => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "") as { open: boolean; id: string | null };
  } catch {
    return { open: false, id: null };
  }
};

// Boîte de discussion flottante : lire et répondre depuis n'importe quelle page, sans passer par le menu Messagerie.
// On peut aussi l'ouvrir sur une conversation avec window.dispatchEvent(new CustomEvent("alumg:chat", { detail: { id } })).
export default function ChatWidget() {
  const { t } = useI18n();
  const { data: me } = useSession();
  const path = usePathname();
  const unread = useUnread();
  const [state, setState] = useState(read);
  const enabled = me?.role === "client" || me?.role === "menuisier";
  const { open, id } = state;
  const { data: convs = [], isLoading } = useConversations(enabled && open);
  const current = convs.find((c) => c.id === id) ?? null;

  const update = useCallback(
    (next: Partial<{ open: boolean; id: string | null }>) =>
    setState((cur) => {
      const merged = { ...cur, ...next };
      try {
        sessionStorage.setItem(KEY, JSON.stringify(merged));
      } catch {
        /* stockage indisponible : la boîte fonctionne quand même */
      }
      return merged;
    }),
    [],
  );

  useEffect(() => {
    const on = (e: Event) => update({ open: true, id: (e as CustomEvent<{ id?: string }>).detail?.id ?? null });
    window.addEventListener("alumg:chat", on);
    return () => window.removeEventListener("alumg:chat", on);
  }, [update]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector("dialog[open]") && update({ open: false });
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open, update]);

  // la page Messagerie fait déjà ce travail
  if (!enabled || path.startsWith("/messages")) return null;

  return (
    <>
      {open && (
        <section role="dialog" aria-label={t("msg.widget.title")} className="chat-pop fixed bottom-24 right-4 z-40 flex h-[min(36rem,calc(100vh-8rem))] w-[min(25rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl max-sm:inset-x-2 max-sm:w-auto">
          <header className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2.5">
            {current ? (
              <>
                <button type="button" onClick={() => update({ id: null })} aria-label={t("common.back")} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink">
                  <ArrowLeft size={18} aria-hidden />
                </button>
                <Avatar name={current.other.name} src={current.other.role === "menuisier" ? current.other.logo || current.other.avatar : current.other.avatar} size={32} round={current.other.role === "client"} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{current.other.name}</span>
                  <span className="block truncate text-[11px] text-muted">{current.other.role === "menuisier" ? t("msg.joiner") : t("msg.client")}</span>
                </span>
              </>
            ) : (
              <h2 className="flex-1 px-1 font-semibold">{t("msg.widget.title")}</h2>
            )}
            <Link href={current ? `/messages?c=${current.id}` : "/messages"} onClick={() => update({ open: false })} aria-label={t("msg.widget.expand")} title={t("msg.widget.expand")} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink">
              <ExternalLink size={16} aria-hidden />
            </Link>
            <button type="button" onClick={() => update({ open: false })} aria-label={t("msg.widget.close")} title={t("msg.widget.close")} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink">
              <X size={18} aria-hidden />
            </button>
          </header>
          {current ? <Thread key={current.id} conv={current} header={false} /> : <ConversationList convs={convs} selected={id} loading={isLoading} compact onSelect={(cid) => update({ id: cid })} />}
        </section>
      )}

      <button
        type="button"
        onClick={() => update({ open: !open })}
        aria-label={t("msg.widget.open")}
        aria-expanded={open}
        title={t("msg.widget.open")}
        className="fixed bottom-5 right-4 z-40 grid size-14 place-items-center rounded-full bg-primary text-on-primary shadow-lg transition-[transform,background-color] hover:scale-105 hover:bg-primary-hover active:scale-95"
      >
        {open ? <X size={24} aria-hidden /> : <MessageCircle size={24} aria-hidden />}
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full border-2 border-bg bg-critical px-1 text-[11px] font-bold leading-4 text-white" aria-label={`${unread} ${t("msg.unread")}`}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
    </>
  );
}
