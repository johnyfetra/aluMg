"use client";
import { Phone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { adminError, ListSkeleton, Pager } from "@/components/admin/AdminUi";
import ChatButton from "@/components/ChatButton";
import { EmptyState, ErrorState } from "@/components/Feedback";
import RoleBadge from "@/components/RoleBadge";
import { useToast } from "@/components/Toast";
import { request, useAdminSiteMessages } from "@/lib/client";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import { formatPhone } from "@/lib/phone";
import type { SiteMessageRow } from "@/lib/site-messages";

const chip = (on: boolean) => `inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors ${on ? "border-accent bg-accent/15 text-ink" : "border-line text-muted hover:bg-surface-2 hover:text-ink"}`;
const STATUSES = ["new", "done"] as const;

function Entry({ row, onStatus }: { row: SiteMessageRow; onStatus: (id: string, s: (typeof STATUSES)[number]) => void }) {
  const { t, locale } = useI18n();
  const wa = `https://wa.me/${row.phone.replace(/\D/g, "")}`;
  return (
    <li className="space-y-3 py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
        <span className="font-semibold">{row.userId ? <Link href={`/admin/comptes/${row.userId}`} className="hover:underline">{row.name}</Link> : row.name}</span>
        {row.role === "visitor" ? <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold leading-none text-muted">{t("admin.site.visitor")}</span> : <RoleBadge role={row.role} />}
        <a href={`tel:${row.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline"><Phone size={13} aria-hidden />{formatPhone(row.phone)}</a>
        <a href={wa} target="_blank" rel="noreferrer" className="text-xs font-semibold text-ok hover:underline">WhatsApp</a>
        {row.page && <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-muted">{row.page}</code>}
        <time dateTime={new Date(row.createdAt).toISOString()} className="ml-auto text-xs text-muted">{new Date(row.createdAt).toLocaleString(DATE_LOCALE[locale], { dateStyle: "medium", timeStyle: "short" })}</time>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{row.message}</p>
      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <button key={s} type="button" aria-pressed={row.status === s} onClick={() => row.status !== s && onStatus(row.id, s)} className={`min-h-8 rounded-lg border px-3 text-xs font-semibold transition-colors ${row.status === s ? "border-accent bg-accent/15 text-ink" : "border-line text-muted hover:bg-surface-2 hover:text-ink"}`}>
            {t(`admin.site.status.${s}`)}
          </button>
        ))}
        {row.userId && row.role !== "admin" && <span className="w-28"><ChatButton compact short={t("admin.write")} target={{ user: row.userId }} label={t("admin.contact")} /></span>}
      </div>
    </li>
  );
}

// Messages laissés par la bulle de discussion du site : profil reconnu par le numéro (visiteur, client, menuisier), rappel ou réponse dans la messagerie.
export default function SiteMessagesPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [status, setStatus] = useState<(typeof STATUSES)[number] | "">("new");
  const [page, setPage] = useState(1);
  const { data, error, isLoading, mutate } = useAdminSiteMessages({ status, page: String(page) });
  const change = async (id: string, s: (typeof STATUSES)[number]) => {
    try {
      await request("PATCH", `/api/admin/site-messages/${id}`, { status: s });
      await mutate();
    } catch (e) {
      toast.error(t("toast.errorTitle"), adminError(e, t));
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.siteMsgs")}{data && data.news > 0 && <span className="ml-3 rounded-full bg-accent/20 px-2.5 py-1 align-middle text-xs font-semibold">{data.news} {t("admin.fb.toRead")}</span>}</h1>
        <p className="text-sm text-muted">{t("admin.siteMsgsSub")}</p>
      </div>
      <div role="group" aria-label={t("admin.fb.statuses")} className="flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={!status} className={chip(!status)} onClick={() => { setStatus(""); setPage(1); }}>{t("admin.fb.all")}</button>
        {STATUSES.map((s) => <button key={s} type="button" aria-pressed={status === s} className={chip(status === s)} onClick={() => { setStatus(s); setPage(1); }}>{t(`admin.site.status.${s}`)}</button>)}
      </div>
      {error ? <ErrorState error={error} retry={() => mutate()} /> : isLoading || !data ? <ListSkeleton /> : data.items.length === 0 ? <EmptyState message={t("admin.siteMsgsEmpty")} /> : (
        <div className="space-y-4">
          <ul className="card divide-y divide-line !py-1">{data.items.map((r) => <Entry key={r.id} row={r} onStatus={change} />)}</ul>
          <Pager page={data.page} pageSize={data.pageSize} total={data.total} noun={t("admin.site.entries")} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
