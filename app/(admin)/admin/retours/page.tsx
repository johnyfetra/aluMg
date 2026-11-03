"use client";
import { Bug, Lightbulb, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { adminError, ListSkeleton, Pager } from "@/components/admin/AdminUi";
import { EmptyState, ErrorState } from "@/components/Feedback";
import { useToast } from "@/components/Toast";
import { request, useAdminFeedback } from "@/lib/client";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import type { FeedbackRow } from "@/lib/feedback";
import { FEEDBACK_KINDS, FEEDBACK_STATUSES, type FeedbackKind, type FeedbackStatus, type Role } from "@/lib/model";

const ICONS = { bug: Bug, idea: Lightbulb, remark: MessageCircle } as const;
const TONE = { bug: "bg-danger/10 text-danger", idea: "bg-accent/15 text-ink", remark: "bg-info/10 text-info" } as const;

function Chips<T extends string>({ label, all, values, value, onChange, name }: { label: string; all: string; values: readonly T[]; value: T | ""; onChange: (v: T | "") => void; name: (v: T) => string }) {
  const chip = (on: boolean) => `inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors ${on ? "border-accent bg-accent/15 text-ink" : "border-line text-muted hover:bg-surface-2 hover:text-ink"}`;
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <button type="button" aria-pressed={!value} className={chip(!value)} onClick={() => onChange("")}>{all}</button>
      {values.map((v) => <button key={v} type="button" aria-pressed={value === v} className={chip(value === v)} onClick={() => onChange(v)}>{name(v)}</button>)}
    </div>
  );
}

function Entry({ row, onStatus }: { row: FeedbackRow; onStatus: (id: string, s: FeedbackStatus) => void }) {
  const { t, locale } = useI18n();
  const Icon = ICONS[row.kind];
  return (
    <li className="space-y-3 py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[row.kind]}`}><Icon size={13} aria-hidden />{t(`fb.kind.${row.kind}`)}</span>
        <span className="font-semibold">{row.userId ? <Link href={`/admin/comptes/${row.userId}`} className="hover:underline">{row.authorName}</Link> : row.authorName}</span>
        <span className="text-muted">{t(`admin.role.${row.authorRole as Role}`)}</span>
        {row.page && <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-muted">{row.page}</code>}
        <time dateTime={new Date(row.createdAt).toISOString()} className="ml-auto text-xs text-muted">{new Date(row.createdAt).toLocaleString(DATE_LOCALE[locale], { dateStyle: "medium", timeStyle: "short" })}</time>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{row.message}</p>
      <div role="group" aria-label={t("admin.fb.statuses")} className="flex flex-wrap gap-1.5">
        {FEEDBACK_STATUSES.map((s) => (
          <button key={s} type="button" aria-pressed={row.status === s} onClick={() => row.status !== s && onStatus(row.id, s)} className={`min-h-8 rounded-lg border px-3 text-xs font-semibold transition-colors ${row.status === s ? "border-accent bg-accent/15 text-ink" : "border-line text-muted hover:bg-surface-2 hover:text-ink"}`}>
            {t(`admin.fb.status.${s}`)}
          </button>
        ))}
      </div>
    </li>
  );
}

export default function FeedbackAdminPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [kind, setKind] = useState<FeedbackKind | "">("");
  const [status, setStatus] = useState<FeedbackStatus | "">("");
  const [page, setPage] = useState(1);
  const { data, error, isLoading, mutate } = useAdminFeedback({ kind, status, page: String(page) });
  const filter = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  const change = async (id: string, s: FeedbackStatus) => {
    try {
      await request("PATCH", `/api/admin/feedback/${id}`, { status: s });
      await mutate();
    } catch (e) {
      toast.error(t("toast.errorTitle"), adminError(e, t));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.feedback")}{data && data.news > 0 && <span className="ml-3 rounded-full bg-accent/20 px-2.5 py-1 align-middle text-xs font-semibold">{data.news} {t("admin.fb.toRead")}</span>}</h1>
        <p className="text-sm text-muted">{t("admin.feedbackSub")}</p>
      </div>
      <div className="space-y-3">
        <Chips label={t("admin.fb.kinds")} all={t("admin.fb.all")} values={FEEDBACK_KINDS} value={kind} onChange={filter(setKind)} name={(k) => t(`fb.kind.${k}`)} />
        <Chips label={t("admin.fb.statuses")} all={t("admin.fb.all")} values={FEEDBACK_STATUSES} value={status} onChange={filter(setStatus)} name={(s) => t(`admin.fb.status.${s}`)} />
      </div>
      {error ? <ErrorState error={error} retry={() => mutate()} /> : isLoading || !data ? <ListSkeleton /> : data.items.length === 0 ? <EmptyState message={t("admin.feedbackEmpty")} /> : (
        <div className="space-y-4">
          <ul className="card divide-y divide-line !py-1">{data.items.map((r) => <Entry key={r.id} row={r} onStatus={change} />)}</ul>
          <Pager page={data.page} pageSize={data.pageSize} total={data.total} noun={t("admin.fb.entries")} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
