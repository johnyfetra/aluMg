"use client";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { ListSkeleton, Pager } from "@/components/admin/AdminUi";
import { QuoteRow } from "@/components/admin/QuoteRows";
import { EmptyState, ErrorState } from "@/components/Feedback";
import Select from "@/components/Select";
import { useAdminQuotes } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { STATUSES } from "@/lib/model";
import type { Messages } from "@/lib/messages/fr";

// Tous les devis de la plateforme (consultation seule).
export default function AdminQuotesPage() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [owner, setOwner] = useState("");
  const [client, setClient] = useState("");
  const [terms, setTerms] = useState({ owner: "", client: "" });
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const id = setTimeout(() => (setTerm(q), setTerms({ owner, client }), setPage(1)), 300);
    return () => clearTimeout(id);
  }, [q, owner, client]);
  const { data, error, isLoading, mutate } = useAdminQuotes({ q: term, ...terms, status, page: String(page) });
  const box = (label: string, value: string, set: (v: string) => void) => (
    <label className="relative min-w-0 flex-1 sm:max-w-xs">
      <span className="sr-only">{label}</span>
      <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input className="input !pl-9" type="search" maxLength={80} placeholder={label} value={value} onChange={(e) => set(e.target.value)} />
    </label>
  );
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.allQuotes")}</h1>
        <p className="text-sm text-muted">{t("admin.quotesSub")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {box(t("admin.searchQuotes"), q, setQ)}
        {box(t("admin.byOwner"), owner, setOwner)}
        {box(t("admin.byClient"), client, setClient)}
        <div className="w-full sm:w-56">
          <Select aria-label={t("status.label")} value={status} onChange={(v) => (setStatus(v), setPage(1))} options={[{ value: "", label: t("admin.allStatuses") }, ...STATUSES.map((s) => ({ value: s, label: t(`status.${s}` as keyof Messages) }))]} />
        </div>
      </div>
      {error ? <ErrorState retry={() => mutate()} /> : isLoading || !data ? <ListSkeleton /> : data.items.length === 0 ? <EmptyState message={t("admin.quotesEmpty")} /> : (
        <div className="space-y-4">
          <ul className="space-y-2 sm:space-y-0 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-line">{data.items.map((x) => <QuoteRow key={x.id} q={x} />)}</ul>
          <Pager page={data.page} pageSize={data.pageSize} total={data.total} noun={t("admin.quotesNoun")} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
