"use client";
import { BellOff, Heart } from "lucide-react";
import { useState } from "react";
import RoleBadge from "./RoleBadge";
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
  const [filter, setFilter] = useState<"all" | "unread" | "fav">("all");
  const shown = convs.filter((c) => (filter === "unread" ? c.unread > 0 : filter === "fav" ? c.favorite : true));
  return (
    <>
    {!compact && convs.length > 0 && (
      <div role="group" aria-label={t("msg.conversations")} className="flex gap-1.5 border-b border-line px-3 py-2">
        {(["all", "unread", "fav"] as const).map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-xs font-medium ${filter === f ? "bg-primary text-on-primary" : "bg-surface-2 text-muted hover:text-ink"}`}>
            {t(f === "all" ? "msg.filterAll" : f === "unread" ? "msg.filterUnread" : "msg.filterFav")}
          </button>
        ))}
      </div>
    )}
    <ul className="min-h-0 flex-1 overflow-y-auto">
      {!loading && convs.length === 0 && <li className="p-6 text-center text-sm text-muted">{t("msg.empty")}</li>}
      {!loading && convs.length > 0 && shown.length === 0 && <li className="p-6 text-center text-sm text-muted">{t("msg.filterNone")}</li>}
      {shown.map((c) => (
        <li key={c.id}>
          <button type="button" aria-current={c.id === selected ? "true" : undefined} onClick={() => onSelect(c.id)} className={`flex w-full items-center gap-3 border-b border-line px-4 text-left transition-colors hover:bg-surface-2 ${compact ? "py-2.5" : "py-3"} ${c.id === selected ? "bg-primary/10" : ""}`}>
            <Avatar name={c.other.name} src={c.other.role !== "client" ? c.other.logo || c.other.avatar : c.other.avatar} size={compact ? 40 : 44} round={c.other.role === "client"} />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5"><span className={`truncate text-sm ${c.unread ? "font-bold" : "font-semibold"}`}>{c.other.name}</span><RoleBadge role={c.other.role} />{c.favorite && <Heart size={12} aria-label={t("msg.filterFav")} fill="currentColor" className="shrink-0 text-primary" />}{c.muted && <BellOff size={12} aria-hidden className="shrink-0 text-muted" />}</span>
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
                  <span className={`grid min-w-5 shrink-0 place-items-center rounded-full px-1.5 ${c.muted ? "bg-muted/60 text-surface" : "bg-primary text-on-primary"} text-[11px] font-bold`} aria-label={`${c.unread} ${t("msg.unread")}`}>
                    {c.unread}
                  </span>
                )}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
    </>
  );
}
