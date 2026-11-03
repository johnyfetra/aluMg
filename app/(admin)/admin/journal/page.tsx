"use client";
import Link from "next/link";
import { useState } from "react";
import { ListSkeleton, Pager } from "@/components/admin/AdminUi";
import { EmptyState, ErrorState } from "@/components/Feedback";
import type { AuditRow } from "@/lib/admin";
import { useAdminAudit } from "@/lib/client";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import type { Role } from "@/lib/model";

function Entry({ e }: { e: AuditRow }) {
  const { t, locale } = useI18n();
  const verb = t(`admin.act.${e.action}`);
  const change = e.action === "role" ? `${t(`admin.role.${e.data.from as Role}`)} → ${t(`admin.role.${e.data.to as Role}`)}` : "";
  return (
    <li className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-4">
      <time dateTime={new Date(e.createdAt).toISOString()} className="shrink-0 text-xs text-muted sm:w-40">{new Date(e.createdAt).toLocaleString(DATE_LOCALE[locale], { dateStyle: "medium", timeStyle: "short" })}</time>
      <p className="min-w-0 text-sm">
        <strong>{e.actorName}</strong> {verb}{" "}
        {e.targetId && e.action !== "delete" ? <Link href={`/admin/comptes/${e.targetId}`} className="font-medium text-primary hover:underline">{e.targetLabel}</Link> : <span className="font-medium">{e.targetLabel}</span>}
        {change && <span className="text-muted"> ({change})</span>}
      </p>
    </li>
  );
}

export default function AuditPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const { data, error, isLoading, mutate } = useAdminAudit(page);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.audit")}</h1>
        <p className="text-sm text-muted">{t("admin.auditSub")}</p>
      </div>
      {error ? <ErrorState retry={() => mutate()} /> : isLoading || !data ? <ListSkeleton /> : data.items.length === 0 ? <EmptyState message={t("admin.auditEmpty")} /> : (
        <div className="space-y-4">
          <ul className="card divide-y divide-line !py-1">{data.items.map((e) => <Entry key={e.id} e={e} />)}</ul>
          <Pager page={data.page} pageSize={data.pageSize} total={data.total} noun={t("admin.entries")} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
