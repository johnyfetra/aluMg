"use client";
import { ArrowLeft, Ban, Bell, BellOff, Download, Eraser, ExternalLink, FileText, Heart, Link2, Star, ThumbsDown, Timer, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { mutate } from "swr";
import { useConfirm } from "./ConfirmDialog";
import Lightbox from "./Lightbox";
import RoleBadge from "./RoleBadge";
import { Avatar } from "./ui";
import { EPHEMERAL, isImageMime, sizeLabel } from "@/lib/attach";
import type { ConversationView } from "@/lib/chat";
import { ApiError, request, useConversationInfo } from "@/lib/client";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import { errorText } from "@/lib/errors";

const REASONS = ["spam", "abuse", "scam", "other"] as const;
const row = "flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-surface-2";

// Panneau « Infos du contact » (comme WhatsApp) : profil, médias / documents / liens, messages importants, réglages et actions sur la discussion.
// Ordinateur : colonne à droite du fil ; mobile : plein écran.
export default function ContactInfo({ conv, onClose, onGone }: { conv: ConversationView; onClose: () => void; onGone: () => void }) {
  const { t, locale } = useI18n();
  const confirm = useConfirm();
  const { data: info } = useConversationInfo(conv.id);
  const [tab, setTab] = useState<"media" | "docs" | "links">("media");
  const [zoom, setZoom] = useState<number | null>(null);
  const [reporting, setReporting] = useState(false);
  const [note, setNote] = useState("");
  const o = conv.other;
  const platform = o.role === "admin"; // la plateforme ne se bloque ni ne se signale
  const refresh = () => Promise.all([mutate("/api/conversations"), mutate(`/api/conversations/${conv.id}/info`), mutate(`/api/conversations/${conv.id}/messages`)]);
  const run = async (fn: () => Promise<unknown>) => {
    setNote("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setNote(e instanceof ApiError ? errorText(e, t) : t("common.error"));
    }
  };
  const prefs = (patch: object) => run(() => request("PATCH", `/api/conversations/${conv.id}/prefs`, patch));
  const act = (body: object) => run(() => request("POST", `/api/conversations/${conv.id}/info`, body));
  const ask = (message: string, confirmLabel: string, then: () => unknown) => void confirm({ message, confirmLabel, tone: "danger" }).then((ok) => ok && then());

  const media = (info?.media ?? []).filter((m) => isImageMime(m.mime));
  const docs = (info?.media ?? []).filter((m) => !isImageMime(m.mime));
  const urls = media.map((m) => `/api/attachments/${m.id}`);
  const date = (iso: string) => new Date(iso).toLocaleDateString(DATE_LOCALE[locale], { day: "numeric", month: "short", year: "numeric" });
  const tabs = [["media", t("ci.tabMedia"), media.length], ["docs", t("ci.tabDocs"), docs.length], ["links", t("ci.tabLinks"), info?.links.length ?? 0]] as const;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface">
      <header className="flex items-center gap-2 border-b border-line px-2 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:px-4 sm:py-3">
        <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-surface-2" aria-label={t("ci.close")} data-tooltip={t("ci.close")}>
          <ArrowLeft size={18} aria-hidden className="lg:hidden" />
          <X size={18} aria-hidden className="max-lg:hidden" />
        </button>
        <h2 className="font-semibold">{t("ci.title")}</h2>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className="flex flex-col items-center gap-2 px-4 py-6 text-center">
          <Avatar name={o.name} src={o.role !== "client" ? o.logo || o.avatar : o.avatar} size={112} round={o.role === "client"} />
          <h3 className="text-xl font-bold">{o.name}</h3>
          <RoleBadge role={o.role} />
          {info && <p className="text-xs text-muted">{t("ci.since")} {date(info.since)}{info.quotes > 0 && ` · ${info.quotes} ${t("ci.quotes").toLowerCase()}`}</p>}
          {o.role === "menuisier" && o.slug && (
            <Link href={`/menuisiers/${o.slug}`} className="btn-secondary !min-h-9 mt-1">
              <ExternalLink size={14} aria-hidden /> {t("dir.viewProfile")}
            </Link>
          )}
        </section>

        <section className="border-t border-line">
          <h3 className="px-4 pt-3 text-sm font-semibold">{t("ci.media")}</h3>
          <div role="tablist" className="flex gap-1 px-3 pt-2">
            {tabs.map(([k, label, n]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full px-3 py-1 text-xs font-medium ${tab === k ? "bg-primary text-on-primary" : "bg-surface-2 text-muted hover:text-ink"}`}>
                {label} {n > 0 && <span className="opacity-70">{n}</span>}
              </button>
            ))}
          </div>
          <div className="p-3">
            {tab === "media" && (media.length ? (
              <div className="grid grid-cols-3 gap-1.5">
                {media.map((m, i) => (
                  <button key={m.id} type="button" onClick={() => setZoom(i)} aria-label={`${t("msg.zoom")}, ${m.name}`} className="aspect-square overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={urls[i]} alt={m.name} loading="lazy" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            ) : <Empty text={t("ci.noMedia")} />)}
            {tab === "docs" && (docs.length ? (
              <ul className="space-y-1.5">
                {docs.map((d) => (
                  <li key={d.id}>
                    <a href={`/api/attachments/${d.id}?download`} download={d.name} className="flex items-center gap-2.5 rounded-lg bg-surface-2 px-2.5 py-2 text-xs hover:bg-line/60">
                      <FileText size={20} aria-hidden className="shrink-0" />
                      <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{d.name}</span><span className="text-muted">{sizeLabel(d.size)} · {date(d.at)}</span></span>
                      <Download size={16} aria-label={t("msg.download")} className="shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : <Empty text={t("ci.noMedia")} />)}
            {tab === "links" && (info?.links.length ? (
              <ul className="space-y-1.5">
                {info.links.map((l, i) => (
                  <li key={`${l.url}${i}`}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-2.5 rounded-lg bg-surface-2 px-2.5 py-2 text-xs hover:bg-line/60">
                      <Link2 size={18} aria-hidden className="shrink-0" />
                      <span className="min-w-0 flex-1"><span className="block truncate font-medium text-primary">{l.url}</span><span className="text-muted">{date(l.at)}</span></span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : <Empty text={t("ci.noMedia")} />)}
          </div>
        </section>

        <section className="border-t border-line">
          <h3 className="flex items-center gap-2 px-4 pt-3 text-sm font-semibold"><Star size={16} aria-hidden /> {t("ci.starred")}</h3>
          <div className="p-3">
            {info?.starred.length ? (
              <ul className="space-y-1.5">
                {info.starred.map((m) => (
                  <li key={m.id} className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1"><span className="block text-[11px] text-muted">{m.mine ? t("msg.you") : o.name} · {date(m.at)}</span><span className="line-clamp-3 whitespace-pre-wrap break-words">{m.body || t("msg.attachment")}</span></span>
                    <button type="button" onClick={() => void act({ action: "star", messageId: m.id, on: false })} aria-label={t("ci.unstar")} data-tooltip={t("ci.unstar")} className="text-primary"><Star size={16} fill="currentColor" aria-hidden /></button>
                  </li>
                ))}
              </ul>
            ) : <Empty text={t("ci.noStarred")} />}
          </div>
        </section>

        <section className="border-t border-line">
          <button type="button" role="switch" aria-checked={conv.muted} onClick={() => void prefs({ muted: !conv.muted })} className={row}>
            {conv.muted ? <BellOff size={18} aria-hidden /> : <Bell size={18} aria-hidden />}
            <span className="flex-1">{t("ci.mute")}</span>
            <span aria-hidden className={`relative h-5 w-9 rounded-full transition-colors ${conv.muted ? "bg-primary" : "bg-line"}`}><span className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${conv.muted ? "left-[1.1rem]" : "left-0.5"}`} /></span>
          </button>
          <div className="px-4 py-3">
            <p className="flex items-center gap-3 text-sm"><Timer size={18} aria-hidden /> {t("ci.ephemeral")}</p>
            <div role="radiogroup" aria-label={t("ci.ephemeral")} className="mt-2 flex flex-wrap gap-1.5 pl-8">
              {EPHEMERAL.map((s) => (
                <button key={s} type="button" role="radio" aria-checked={conv.ephemeralSec === s} onClick={() => void act({ action: "ephemeral", seconds: s })} className={`rounded-full px-3 py-1 text-xs font-medium ${conv.ephemeralSec === s ? "bg-primary text-on-primary" : "bg-surface-2 text-muted hover:text-ink"}`}>
                  {t(`ci.eph.${s}` as "ci.eph.0")}
                </button>
              ))}
            </div>
            <p className="mt-1.5 pl-8 text-xs text-muted">{t("ci.ephHint")}</p>
          </div>
        </section>

        <section className="border-t border-line py-1">
          <button type="button" onClick={() => void prefs({ favorite: !conv.favorite })} className={row}>
            <Heart size={18} aria-hidden fill={conv.favorite ? "currentColor" : "none"} className={conv.favorite ? "text-primary" : ""} />
            {t(conv.favorite ? "ci.favRemove" : "ci.favAdd")}
          </button>
        </section>

        <section className="border-t border-line py-1 text-danger">
          <button type="button" className={row} onClick={() => ask(t("ci.clearAsk"), t("ci.clear"), () => act({ action: "clear" }))}><Eraser size={18} aria-hidden /> {t("ci.clear")}</button>
          {!platform && (
            <>
              <button type="button" className={row} onClick={() => (conv.blocked === "me" ? void prefs({ blocked: false }) : ask(t("ci.blockAsk"), t("ci.block"), () => prefs({ blocked: true })))}>
                <Ban size={18} aria-hidden /> {t(conv.blocked === "me" ? "ci.unblock" : "ci.block")} {o.name}
              </button>
              <button type="button" className={row} aria-expanded={reporting} onClick={() => setReporting((v) => !v)}><ThumbsDown size={18} aria-hidden /> {t("ci.report")} {o.name}</button>
              {reporting && (
                <div role="group" aria-label={t("ci.reportTitle")} className="space-y-1.5 px-4 pb-3 pl-11 text-ink">
                  <p className="text-xs text-muted">{t("ci.reportTitle")}</p>
                  {REASONS.map((r) => (
                    <button key={r} type="button" className="block w-full rounded-lg bg-surface-2 px-3 py-2 text-left text-sm hover:bg-line/60" onClick={() => { setReporting(false); void act({ action: "report", reason: r }).then(() => setNote(t("ci.reported"))); }}>
                      {t(`ci.reason.${r}` as "ci.reason.spam")}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          <button type="button" className={row} onClick={() => ask(t("ci.deleteAsk"), t("ci.delete"), async () => { await act({ action: "delete" }); onGone(); })}><Trash2 size={18} aria-hidden /> {t("ci.delete")}</button>
        </section>
        {note && <p role="status" className="px-4 pb-4 text-sm font-medium text-muted">{note}</p>}
      </div>
      {zoom !== null && <Lightbox images={urls} index={zoom} onIndex={setZoom} onClose={() => setZoom(null)} label={t("msg.zoom")} />}
    </div>
  );
}

const Empty = ({ text }: { text: string }) => <p className="py-3 text-center text-xs text-muted">{text}</p>;
