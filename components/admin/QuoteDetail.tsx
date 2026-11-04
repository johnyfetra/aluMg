"use client";
import { ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";
import { ListSkeleton } from "@/components/admin/AdminUi";
import { QuoteStatus } from "@/components/admin/QuoteRows";
import { ErrorState } from "@/components/Feedback";
import { fmt, lineTotal } from "@/lib/calc";
import { useAdminQuote } from "@/lib/client";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import { serviceTotal } from "@/lib/totals";

// Un devis, tel que son menuisier l'a établi (prix de vente seulement ; coûts et marges restent dans l'éditeur du menuisier). Aucune action.
export default function QuoteDetail({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const { data: d, error, isLoading, mutate } = useAdminQuote(id);
  if (error) return <ErrorState retry={() => mutate()} />;
  if (isLoading || !d) return <ListSkeleton rows={4} />;
  const { quote: q, totals: tt } = d;
  const row = (label: string, value: string) => <div className="flex justify-between gap-3 py-2 text-sm"><dt className="text-muted">{label}</dt><dd className="min-w-0 break-words text-right font-medium">{value || "—"}</dd></div>;
  return (
    <div className="space-y-6">
      <Link href="/admin/devis" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} aria-hidden />{t("admin.allQuotes")}</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold">{q.number}</h1>
        <QuoteStatus status={q.status} />
        <span className="text-sm text-muted">{new Date(d.createdAt).toLocaleString(DATE_LOCALE[locale], { dateStyle: "medium", timeStyle: "short" })}</span>
      </div>
      <p role="note" className="card flex items-start gap-3 text-sm"><Eye size={18} aria-hidden className="mt-0.5 shrink-0 text-muted" />{t("admin.readOnly")}</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card" aria-labelledby="h-q-client">
          <h2 id="h-q-client" className="mb-2 font-semibold">{t("pdf.client")}</h2>
          <dl className="divide-y divide-line">
            {row(t("settings.companyName"), q.client.name)}
            {row(t("settings.phone"), q.client.phone)}
            {row(t("settings.email"), q.client.email)}
            {row(t("settings.address"), q.client.address)}
            {row(t("pdf.project"), q.project)}
            {row(t("pdf.delay"), q.delay)}
            {row(t("pdf.notes"), q.notes)}
          </dl>
        </section>
        <section className="card" aria-labelledby="h-q-who">
          <h2 id="h-q-who" className="mb-2 font-semibold">{t("admin.owner")}</h2>
          <p className="py-2 text-sm"><Link href={`/admin/comptes/${d.ownerId}`} className="font-semibold text-primary hover:underline">{d.ownerName}</Link></p>
          {d.clientId && <p className="py-2 text-sm text-muted">{t("admin.clientAccount")} : <Link href={`/admin/comptes/${d.clientId}`} className="font-semibold text-primary hover:underline">{q.client.name}</Link></p>}
          <dl className="divide-y divide-line">
            {row(t("settings.tva"), `${q.terms.tva} %`)}
            {row(t("settings.deposit"), `${q.terms.deposit} %`)}
            {row(t("settings.validity"), String(q.terms.validityDays))}
          </dl>
        </section>
      </div>

      <section className="card" aria-labelledby="h-q-lines">
        <h2 id="h-q-lines" className="mb-2 font-semibold">{t("admin.quoteLines")}</h2>
        <ul className="divide-y divide-line">
          {q.lines.map((l) => (
            <li key={l.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm">
              <span className="min-w-0"><span className="font-medium">{t(`cat.${l.category}`)}</span> · {l.width} × {l.height} mm{l.room ? ` · ${l.room}` : ""}</span>
              <span className="shrink-0 text-muted">{l.qty} × {fmt(l.unit)} = <strong className="text-ink">{fmt(lineTotal(l))} Ar</strong></span>
            </li>
          ))}
        </ul>
        {!!q.services?.length && (
          <>
            <h3 className="mb-1 mt-4 text-sm font-semibold">{t("admin.quoteServices")}</h3>
            <ul className="divide-y divide-line">
              {q.services.map((s) => (
                <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm"><span>{s.label}</span><span className="text-muted">{s.qty} × {fmt(s.price)} = <strong className="text-ink">{fmt(serviceTotal(s))} Ar</strong></span></li>
              ))}
            </ul>
          </>
        )}
        <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
          {tt.discount > 0 && <div className="flex justify-between"><dt className="text-muted">{q.discount} %</dt><dd>− {fmt(tt.discount)} Ar</dd></div>}
          <div className="flex justify-between"><dt className="text-muted">{t("pdf.totalHt")}</dt><dd>{fmt(tt.ht)} Ar</dd></div>
          <div className="flex justify-between"><dt className="text-muted">{t("pdf.totalTva")}</dt><dd>{fmt(tt.tva)} Ar</dd></div>
          <div className="flex justify-between text-base font-bold"><dt>{t("pdf.totalTtc")}</dt><dd>{fmt(tt.ttc)} Ar</dd></div>
        </dl>
      </section>
    </div>
  );
}
