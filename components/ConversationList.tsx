"use client";
import { Ticks } from "./ChatThread";
import { Avatar } from "./ui";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import type { ConversationView } from "@/lib/chat";

// Liste des conversations (page Messagerie et boîte flottante) : interlocuteur, dernier message avec son accusé, pastille de non-lus.
export default function ConversationList({ convs, selected, onSelect, loading, compact = false }: { convs: ConversationView[]; selected: string | null; onSelect: (id: string) => void; loading: boolean; compact?: boolean }) {
  const { t, locale } = useI18n();
  const time = (iso: string) => {
    const d = new Date(iso);
    return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString(DATE_LOCALE[locale], { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString(DATE_LOCALE[locale], { day: "numeric", month: "short" });
  };
  return (
    <ul className="min-h-0 flex-1 overflow-y-auto">
      {!loading && convs.length === 0 && <li className="p-6 text-center text-sm text-muted">{t("msg.empty")}</li>}
      {convs.map((c) => (
        <li key={c.id}>
          <button type="button" aria-current={c.id === selected ? "true" : undefined} onClick={() => onSelect(c.id)} className={`flex w-full items-center gap-3 border-b border-line px-4 text-left transition-colors hover:bg-surface-2 ${compact ? "py-2.5" : "py-3"} ${c.id === selected ? "bg-primary/10" : ""}`}>
            <Avatar name={c.other.name} src={c.other.role === "menuisier" ? c.other.logo || c.other.avatar : c.other.avatar} size={compact ? 40 : 44} round={c.other.role === "client"} />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className={`truncate text-sm ${c.unread ? "font-bold" : "font-semibold"}`}>{c.other.name}</span>
                {c.last && <span className="shrink-0 text-[11px] text-muted">{time(c.last.at)}</span>}
              </span>
              <span className="flex items-center justify-between gap-2">
                <span className={`flex min-w-0 items-center gap-1 text-sm ${c.unread ? "font-medium text-ink" : "text-muted"}`}>
                  {c.last?.receipt && <Ticks receipt={c.last.receipt} t={t} onPrimary={false} />}
                  <span className="truncate">
                    {c.last ? `${c.last.mine && !c.last.receipt ? `${t("msg.you")} : ` : ""}${c.last.body || (c.last.quote ? t("msg.quoteWord") : c.last.files ? t("msg.attachment") : "")}` : t("msg.noMessage")}
                  </span>
                </span>
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
  );
}
