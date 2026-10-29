"use client";
import { ArrowLeft, ChevronDown, ChevronUp, ExternalLink, Maximize2, MessageCircle, Minimize2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Thread from "./ChatThread";
import ConversationList from "./ConversationList";
import { Avatar } from "./ui";
import { useConversations, useSession, useUnread } from "@/lib/client";
import { useI18n } from "@/lib/i18n";

type State = { open: boolean; id: string | null; big: boolean };
const KEY = "alumg.chat";
const read = (): State => {
  try {
    return { open: false, id: null, big: false, ...JSON.parse(sessionStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { open: false, id: null, big: false };
  }
};

// Messagerie ancrée dans le coin inférieur droit, comme sur LinkedIn : une barre repliée, qui s'ouvre en petite fenêtre (liste puis discussion),
// agrandissable d'un cran ou ouvrable en pleine page. On peut l'ouvrir sur une conversation avec
// window.dispatchEvent(new CustomEvent("alumg:chat", { detail: { id } })).
export default function ChatWidget() {
  const { t } = useI18n();
  const { data: me } = useSession();
  const path = usePathname();
  const unread = useUnread();
  const [state, setState] = useState(read);
  const enabled = !!me?.verified && (me.role === "client" || me.role === "menuisier");
  const { open, id, big } = state;
  const { data: convs = [], isLoading } = useConversations(enabled && open);
  const current = convs.find((c) => c.id === id) ?? null;

  const update = useCallback(
    (next: Partial<State>) =>
      setState((cur) => {
        const merged = { ...cur, ...next };
        try {
          sessionStorage.setItem(KEY, JSON.stringify(merged));
        } catch {
          /* stockage indisponible : la messagerie fonctionne quand même */
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

  const icon = "grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-line/60 hover:text-ink";
  const expandHref = current ? `/messages?c=${current.id}` : "/messages";

  return (
    <section
      aria-label={t("msg.widget.title")}
      className={`fixed bottom-0 right-5 z-40 flex flex-col overflow-hidden rounded-t-xl border border-b-0 border-line bg-surface shadow-[0_-6px_28px_rgba(15,23,42,0.16)] transition-[width,box-shadow] duration-200 hover:shadow-[0_-8px_34px_rgba(15,23,42,0.22)] max-sm:hidden ${big ? "w-[30rem]" : "w-[23rem]"}`}
    >
      <div className={`flex h-12 shrink-0 items-center gap-1 pr-2 transition-colors ${open ? "border-b border-line" : "hover:bg-surface-2"}`}>
        {current && open ? (
          <>
            <button type="button" onClick={() => update({ id: null })} aria-label={t("common.back")} className={`${icon} ml-2`}>
              <ArrowLeft size={17} aria-hidden />
            </button>
            <button type="button" onClick={() => update({ open: false })} aria-label={t("msg.widget.close")} className="flex min-w-0 flex-1 items-center gap-2.5 py-1 pl-1 text-left">
              <Avatar name={current.other.name} src={current.other.role === "menuisier" ? current.other.logo || current.other.avatar : current.other.avatar} size={30} round={current.other.role === "client"} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold leading-tight">{current.other.name}</span>
                <span className="block truncate text-[11px] leading-tight text-muted">{current.other.role === "menuisier" ? t("msg.joiner") : t("msg.client")}</span>
              </span>
            </button>
          </>
        ) : (
          <button type="button" onClick={() => update({ open: !open })} aria-expanded={open} aria-label={t("msg.widget.open")} className="flex h-full min-w-0 flex-1 items-center gap-3 pl-4 text-left">
            <span className="relative grid size-8 place-items-center rounded-full bg-primary text-on-primary">
              <MessageCircle size={16} aria-hidden />
              {!open && unread > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid min-w-4 place-items-center rounded-full border-2 border-surface bg-critical px-1 text-[10px] font-bold leading-3 text-white" aria-label={`${unread} ${t("msg.unread")}`}>
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </span>
            <span className="truncate text-sm font-semibold">{t("msg.widget.title")}</span>
          </button>
        )}
        {open && (
          <>
            <button type="button" onClick={() => update({ big: !big })} aria-label={t(big ? "msg.widget.shrink" : "msg.widget.enlarge")} title={t(big ? "msg.widget.shrink" : "msg.widget.enlarge")} className={`${icon} max-sm:hidden`}>
              {big ? <Minimize2 size={15} aria-hidden /> : <Maximize2 size={15} aria-hidden />}
            </button>
            <Link href={expandHref} onClick={() => update({ open: false })} aria-label={t("msg.widget.expand")} title={t("msg.widget.expand")} className={icon}>
              <ExternalLink size={15} aria-hidden />
            </Link>
          </>
        )}
        <button type="button" onClick={() => update({ open: !open })} aria-label={t(open ? "msg.widget.close" : "msg.widget.open")} title={t(open ? "msg.widget.close" : "msg.widget.open")} className={icon}>
          {open ? <ChevronDown size={18} aria-hidden /> : <ChevronUp size={18} aria-hidden />}
        </button>
      </div>

      {open && (
        <div role="dialog" aria-label={t("msg.widget.title")} className={`chat-pop flex min-h-0 flex-col ${big ? "h-[min(38rem,calc(100vh-4rem))]" : "h-[min(27rem,calc(100vh-4rem))]"}`}>
          {current ? <Thread key={current.id} conv={current} header={false} compact /> : <ConversationList convs={convs} selected={id} loading={isLoading} compact onSelect={(cid) => update({ id: cid })} />}
        </div>
      )}
    </section>
  );
}
