"use client";
import { MapPin, Phone, Video } from "lucide-react";
import { useState } from "react";
import { adminError, ListSkeleton, Pager } from "@/components/admin/AdminUi";
import { EmptyState, ErrorState } from "@/components/Feedback";
import { useToast } from "@/components/Toast";
import { DEMO_STATUSES, type DemoStatus } from "@/lib/booking";
import { request, useAdminDemos } from "@/lib/client";
import type { DemoRow } from "@/lib/demos";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import { formatPhone } from "@/lib/phone";

const chip = (on: boolean) => `inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors ${on ? "border-accent bg-accent/15 text-ink" : "border-line text-muted hover:bg-surface-2 hover:text-ink"}`;

function Entry({ row, onStatus }: { row: DemoRow; onStatus: (id: string, s: DemoStatus) => void }) {
  const { t, locale } = useI18n();
  const when = new Date(`${row.day}T12:00:00Z`).toLocaleDateString(DATE_LOCALE[locale], { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
  return (
    <li className="space-y-3 py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
        <span className="font-semibold capitalize">{when} · {row.slot}</span>
        <span className="font-medium">{row.name}</span>
        <a href={`tel:${row.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline"><Phone size={13} aria-hidden />{formatPhone(row.phone)}</a>
      </div>
      {row.mode === "online" ? <p className="flex items-center gap-1.5 text-sm"><Video size={14} aria-hidden className="shrink-0 text-muted" />{t("admin.demo.online")}</p> : <p className="flex items-start gap-1.5 text-sm"><MapPin size={14} aria-hidden className="mt-0.5 shrink-0 text-muted" />{row.place}</p>}
      {row.note && <p className="whitespace-pre-wrap text-sm text-muted">{row.note}</p>}
      <div role="group" aria-label={t("admin.fb.statuses")} className="flex flex-wrap gap-1.5">
        {DEMO_STATUSES.map((s) => (
          <button key={s} type="button" aria-pressed={row.status === s} onClick={() => row.status !== s && onStatus(row.id, s)} className={`min-h-8 rounded-lg border px-3 text-xs font-semibold transition-colors ${row.status === s ? "border-accent bg-accent/15 text-ink" : "border-line text-muted hover:bg-surface-2 hover:text-ink"}`}>
            {t(`admin.demo.status.${s}`)}
          </button>
        ))}
      </div>
    </li>
  );
}

// Rendez-vous de démonstration pris depuis la page d'accueil : appeler, confirmer, marquer fait ou annulé.
export default function DemosAdminPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [status, setStatus] = useState<DemoStatus | "">("new");
  const [page, setPage] = useState(1);
  const { data, error, isLoading, mutate } = useAdminDemos({ status, page: String(page) });

  const change = async (id: string, s: DemoStatus) => {
    try {
      await request("PATCH", `/api/admin/demo-bookings/${id}`, { status: s });
      await mutate();
    } catch (e) {
      toast.error(t("toast.errorTitle"), adminError(e, t));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.demos")}{data && data.news > 0 && <span className="ml-3 rounded-full bg-accent/20 px-2.5 py-1 align-middle text-xs font-semibold">{data.news} {t("admin.demo.toConfirm")}</span>}</h1>
        <p className="text-sm text-muted">{t("admin.demosSub")}</p>
      </div>
      <div role="group" aria-label={t("admin.fb.statuses")} className="flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={!status} className={chip(!status)} onClick={() => { setStatus(""); setPage(1); }}>{t("admin.fb.all")}</button>
        {DEMO_STATUSES.map((s) => <button key={s} type="button" aria-pressed={status === s} className={chip(status === s)} onClick={() => { setStatus(s); setPage(1); }}>{t(`admin.demo.status.${s}`)}</button>)}
      </div>
      {error ? <ErrorState error={error} retry={() => mutate()} /> : isLoading || !data ? <ListSkeleton /> : data.items.length === 0 ? <EmptyState message={t("admin.demosEmpty")} /> : (
        <div className="space-y-4">
          <ul className="card divide-y divide-line !py-1">{data.items.map((r) => <Entry key={r.id} row={r} onStatus={change} />)}</ul>
          <Pager page={data.page} pageSize={data.pageSize} total={data.total} noun={t("admin.demo.entries")} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
