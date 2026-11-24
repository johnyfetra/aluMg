"use client";
import { Check, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { adminError, ListSkeleton, Pager } from "@/components/admin/AdminUi";
import { EmptyState, ErrorState } from "@/components/Feedback";
import { PayStatusBadge } from "@/components/Subscription";
import { useToast } from "@/components/Toast";
import type { PaymentRow } from "@/lib/billing";
import { fmt } from "@/lib/calc";
import { request, useAdminPayments } from "@/lib/client";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import { PAY_STATUSES, type PayStatus } from "@/lib/model";
import { formatPhone, normalizePhone } from "@/lib/phone";

const phone = (raw: string) => (raw ? formatPhone(normalizePhone(raw) ?? raw) : "");

// Paiements d'abonnement déclarés par les menuisiers : l'équipe compare le code de transfert à ses SMS de réception, puis confirme ou refuse.
function Entry({ row, onReview }: { row: PaymentRow; onReview: (id: string, decision: "confirm" | "reject", note: string) => Promise<void> }) {
  const { t, locale } = useI18n();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const act = async (d: "confirm" | "reject") => {
    setBusy(true);
    await onReview(row.id, d, note);
    setBusy(false);
  };
  const date = (x: Date | string) => new Date(x).toLocaleString(DATE_LOCALE[locale], { dateStyle: "medium", timeStyle: "short" });
  return (
    <li className="space-y-3 py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
        <PayStatusBadge status={row.status} />
        <Link href={`/admin/comptes/${row.userId}`} className="font-semibold hover:underline">{row.name}</Link>
        <span className="text-muted">{phone(row.phone)}</span>
        <time dateTime={new Date(row.createdAt).toISOString()} className="ml-auto text-xs text-muted">{date(row.createdAt)}</time>
      </div>
      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-muted">{t("pay.operator")}</dt>
        <dd className="font-semibold">{t(`pay.op.${row.operator}`)}</dd>
        <dt className="text-muted">{t("pay.reference")}</dt>
        <dd className="font-mono text-base font-bold">{row.reference}</dd>
        {row.payerPhone && <><dt className="text-muted">{t("pay.payerPhone")}</dt><dd>{phone(row.payerPhone)}</dd></>}
        <dt className="text-muted">{t("pay.expected")}</dt>
        <dd className="font-semibold">{fmt(row.amount)} {t("common.currency")} · {row.months} {t("svc.months")}</dd>
        {row.paidUntil && <><dt className="text-muted">{t("pay.paidUntil")}</dt><dd>{new Date(row.paidUntil).toLocaleDateString(DATE_LOCALE[locale], { dateStyle: "medium" })}</dd></>}
        {row.note && <><dt className="text-muted">{t("pay.note")}</dt><dd>{row.note}</dd></>}
      </dl>
      {row.status === "pending" && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1 space-y-1 text-sm">
            <span className="text-muted">{t("pay.rejectNote")}</span>
            <input className="input" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button type="button" className="btn-secondary !min-h-10 text-danger" disabled={busy} onClick={() => act("reject")}><X size={16} aria-hidden />{t("pay.reject")}</button>
          <button type="button" className="btn-primary !min-h-10" disabled={busy} onClick={() => act("confirm")}><Check size={16} aria-hidden />{t("pay.confirm")}</button>
        </div>
      )}
    </li>
  );
}

export default function PaymentsAdminPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [status, setStatus] = useState<PayStatus | "">("pending");
  const [page, setPage] = useState(1);
  const { data, error, isLoading, mutate } = useAdminPayments({ status, page: String(page) });
  const chip = (on: boolean) => `inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors ${on ? "border-accent bg-accent/15 text-ink" : "border-line text-muted hover:bg-surface-2 hover:text-ink"}`;
  const pick = (s: PayStatus | "") => { setStatus(s); setPage(1); };

  const review = async (id: string, decision: "confirm" | "reject", note: string) => {
    try {
      await request("PATCH", `/api/admin/payments/${id}`, { decision, note });
      toast.success(t(decision === "confirm" ? "pay.confirmed" : "pay.rejected"));
      await mutate();
    } catch (e) {
      toast.error(t("toast.errorTitle"), adminError(e, t));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.payments")}{data && data.news > 0 && <span className="ml-3 rounded-full bg-accent/20 px-2.5 py-1 align-middle text-xs font-semibold">{data.news} {t("pay.toCheck")}</span>}</h1>
        <p className="text-sm text-muted">{t("admin.paymentsSub")}</p>
      </div>
      <div role="group" aria-label={t("admin.fb.statuses")} className="flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={!status} className={chip(!status)} onClick={() => pick("")}>{t("admin.fb.all")}</button>
        {PAY_STATUSES.map((s) => <button key={s} type="button" aria-pressed={status === s} className={chip(status === s)} onClick={() => pick(s)}>{t(`pay.status.${s}`)}</button>)}
      </div>
      {error ? <ErrorState error={error} retry={() => mutate()} /> : isLoading || !data ? <ListSkeleton /> : data.items.length === 0 ? <EmptyState message={t("pay.empty")} /> : (
        <div className="space-y-4">
          <ul className="card divide-y divide-line !py-1">{data.items.map((r) => <Entry key={r.id} row={r} onReview={review} />)}</ul>
          <Pager page={data.page} pageSize={data.pageSize} total={data.total} noun={t("pay.entries")} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
