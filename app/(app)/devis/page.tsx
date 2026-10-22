"use client";
import { Download, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { StatusBadge } from "@/components/ui";
import { fmt } from "@/lib/calc";
import { useQuotes, useSettings } from "@/lib/client";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import { STATUSES, type Quote, type Status } from "@/lib/model";
import { totals } from "@/lib/totals";
import Select from "@/components/Select";

export default function QuotesPage() {
  return (
    <Suspense fallback={null}>
      <QuotesView />
    </Suspense>
  );
}

function QuotesView() {
  const { t, locale } = useI18n();
  const params = useSearchParams();
  const { quotes = [], loading, save, remove } = useQuotes();
  const { settings } = useSettings();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState<Status | "all">("all");

  const needle = search.trim().toLowerCase();
  const shown = [...quotes]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((q) => (status === "all" || q.status === status) && (!needle || q.number.toLowerCase().includes(needle) || q.client.name.toLowerCase().includes(needle)));

  const pdf = async (q: Quote) => {
    if (!settings) return;
    const { quotePdf } = await import("@/lib/pdf");
    await quotePdf(q, settings, t, locale, false);
  };
  const date = (q: Quote) => new Date(q.date).toLocaleDateString(DATE_LOCALE[locale]);
  // Un devis lié à un compte client change de statut par ses actions (envoi, acceptation…) : pas de menu libre.
  const statusSelect = (q: Quote) => q.clientId ? null : (
    <Select
      aria-label={`${t("status.label")} — ${q.number}`}
      value={q.status}
      onChange={(v) => save({ ...q, status: v as Status }, false)}
      className="!min-h-9 !w-auto !py-1 text-sm"
      options={STATUSES.filter((s) => s !== "requested").map((s) => ({ value: s, label: t(`status.${s}`) }))}
    />
  );
  const actions = (q: Quote) => (
    <div className="flex gap-2">
      <button type="button" className="btn-secondary !min-h-9 !px-3" onClick={() => pdf(q)} aria-label={`${t("quotes.pdf")} ${q.number}`}>
        <Download size={16} aria-hidden />
        PDF
      </button>
      <Link href={`/devis/${q.id}`} className="btn-secondary !min-h-9 !px-3" aria-label={`${t("common.edit")} ${q.number}`}>
        <Pencil size={16} aria-hidden />
      </Link>
      <button type="button" className="btn-danger !min-h-9 !px-3" aria-label={`${t("common.delete")} ${q.number}`} onClick={() => confirm(t("common.confirmDelete")) && remove(q.id)}>
        <Trash2 size={16} aria-hidden />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("quotes.title")}</h1>
        <Link href="/devis/nouveau" className="btn-primary">
          <Plus size={18} aria-hidden />
          {t("nav.new")}
        </Link>
      </div>

      {quotes.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-md">
            <Search size={18} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="search" aria-label={t("quotes.search")} placeholder={t("quotes.search")} className="input !pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div role="group" aria-label={t("status.label")} className="flex flex-wrap gap-1.5">
            {(["all", ...STATUSES] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
                className={`min-h-9 rounded-full border px-3 text-sm font-medium transition-colors ${status === s ? "border-primary bg-primary text-on-primary" : "border-line bg-surface hover:bg-surface-2"}`}
              >
                {s === "all" ? t("quotes.filterAll") : t(`status.${s}`)}
                <span className="ml-1.5 text-xs opacity-70">{s === "all" ? quotes.length : quotes.filter((q) => q.status === s).length}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && quotes.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="mb-4 text-muted">{t("quotes.empty")}</p>
          <Link href="/devis/nouveau" className="btn-primary">
            {t("quotes.emptyCta")}
          </Link>
        </div>
      ) : shown.length === 0 && !loading ? (
        <p className="text-muted">{t("quotes.noResult")}</p>
      ) : (
        <>
          {/* Tableau sur grand écran */}
          <div className="card hidden overflow-hidden !p-0 md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t("quotes.col.number")}</th>
                  <th className="px-4 py-3 font-semibold">{t("quotes.col.client")}</th>
                  <th className="px-4 py-3 font-semibold">{t("quotes.col.date")}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t("quotes.col.total")}</th>
                  <th className="px-4 py-3 font-semibold">{t("quotes.col.status")}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t("quotes.col.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((q) => (
                  <tr key={q.id} className="transition-colors hover:bg-surface-2/60">
                    <td className="px-4 py-3">
                      <Link href={`/devis/${q.id}`} className="font-semibold text-primary hover:underline">
                        {q.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{q.client.name || t("quotes.noClient")}</p>
                      {q.project && <p className="max-w-64 truncate text-xs text-muted">{q.project}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted">{date(q)}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {fmt(totals(q).ttc)} {t("common.currency")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={q.status} label={t(`status.${q.status}`)} />
                        {statusSelect(q)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">{actions(q)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cartes sur mobile */}
          <ul className="space-y-3 md:hidden">
            {shown.map((q) => (
              <li key={q.id} className="card space-y-3 !p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/devis/${q.id}`} className="font-semibold text-primary hover:underline">
                      {q.number}
                    </Link>
                    <p className="text-sm">{q.client.name || t("quotes.noClient")}</p>
                    <p className="text-xs text-muted">{date(q)}</p>
                  </div>
                  <p className="font-semibold">
                    {fmt(totals(q).ttc)} {t("common.currency")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={q.status} label={t(`status.${q.status}`)} />
                  {statusSelect(q)}
                </div>
                {actions(q)}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
