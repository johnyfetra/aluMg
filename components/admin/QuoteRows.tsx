"use client";
import Link from "next/link";
import type { AdminQuoteRow } from "@/lib/admin";
import { fmt } from "@/lib/calc";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import type { Messages } from "@/lib/messages/fr";

export function QuoteStatus({ status }: { status: string }) {
  const { t } = useI18n();
  return <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold">{t(`status.${status}` as keyof Messages)}</span>;
}

// Une ligne par devis : numéro, client et projet, émetteur, statut, total TTC. Mène au détail en lecture seule.
export function QuoteRow({ q }: { q: AdminQuoteRow }) {
  const { t, locale } = useI18n();
  return (
    <li>
      <Link href={`/admin/devis/${q.id}`} className="card flex flex-col gap-1 !p-3 transition-shadow hover:shadow-md sm:grid sm:grid-cols-[7rem_minmax(0,2fr)_minmax(0,1fr)_8rem_8rem] sm:items-center sm:gap-4 sm:rounded-none sm:border-x-0 sm:border-t-0 sm:!px-4 sm:shadow-none sm:hover:bg-surface-2">
        <span className="font-mono text-sm font-semibold">{q.number}</span>
        <span className="min-w-0">
          <span className="block truncate font-medium">{q.clientName || "—"}</span>
          <span className="block truncate text-sm text-muted">{q.project || "—"}</span>
        </span>
        <span className="min-w-0 truncate text-sm text-muted">{t("admin.owner")} {q.ownerName}</span>
        <span className="flex items-center gap-2 sm:block"><QuoteStatus status={q.status} /><span className="text-xs text-muted sm:mt-1 sm:block">{new Date(q.createdAt).toLocaleDateString(DATE_LOCALE[locale], { day: "numeric", month: "short", year: "numeric" })}</span></span>
        <span className="text-sm font-semibold sm:text-right">{fmt(q.ttc)} Ar</span>
      </Link>
    </li>
  );
}
