"use client";
import { ArrowLeft, Eye, FileDown, Printer } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { ListSkeleton } from "@/components/admin/AdminUi";
import { QuoteStatus } from "@/components/admin/QuoteRows";
import ChatButton from "@/components/ChatButton";
import { ErrorState } from "@/components/Feedback";
import QuoteDiscussion from "@/components/QuoteDiscussion";
import QuotePaper from "@/components/QuotePaper";
import { useAdminQuote } from "@/lib/client";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";

// Un devis tel que son menuisier l'a établi : feuille et PDF, remarques par ouvrage, discussion et historique. Consultation seule, aucune action.
export default function QuoteDetail({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const { data: d, error, isLoading, mutate } = useAdminQuote(id);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (error) return <ErrorState retry={() => mutate()} />;
  if (isLoading || !d) return <ListSkeleton rows={4} />;
  const { quote: q } = d;
  const pdf = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const { quotePdf } = await import("@/lib/pdf");
      await quotePdf(q, d.settings, t, locale, true); // avec la fiche de débit : l'administration voit tout ce que le menuisier voit
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
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
            {row(t("admin.downloads"), d.downloads.total ? `${d.downloads.total} · ${d.downloads.menuisier} ${t("admin.downloadsSplit")}, ${d.downloads.client} ${t("admin.downloadsClient")} · ${t("admin.downloadsLast")} ${new Date(d.downloads.last!).toLocaleDateString(DATE_LOCALE[locale], { day: "numeric", month: "short", year: "numeric" })}` : t("admin.downloadsNone"))}
          </dl>
          {/* l'administration écrit sous le profil AluMg : le destinataire voit la plateforme, pas un compte personnel */}
          <div className="mt-3 flex flex-wrap gap-2">
            <ChatButton target={{ user: d.ownerId }} label={t("admin.contactOwner")} className="btn-secondary !min-h-10" />
            {d.clientId && <ChatButton target={{ user: d.clientId }} label={t("admin.contactClient")} className="btn-secondary !min-h-10" />}
          </div>
        </section>
      </div>

      <section className="space-y-3" aria-labelledby="h-q-paper">
        <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <h2 id="h-q-paper" className="font-semibold">{t("admin.quotePaper")}</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary !min-h-10" onClick={() => window.print()}><Printer size={16} aria-hidden />{t("preview.print")}</button>
            <button type="button" className="btn-primary !min-h-10" onClick={pdf} disabled={busy}><FileDown size={16} aria-hidden />{t("preview.pdf")}</button>
          </div>
        </div>
        {failed && <p role="alert" className="text-sm font-medium text-danger print:hidden">{t("common.error")}</p>}
        <QuotePaper q={q} s={d.settings} t={t} locale={locale} />
      </section>

      {d.comments.length > 0 && (
        <section className="card print:hidden" aria-labelledby="h-q-notes">
          <h2 id="h-q-notes" className="mb-2 font-semibold">{t("admin.quoteNotes")}</h2>
          <ul className="divide-y divide-line">
            {d.comments.map((c) => {
              const l = q.lines.find((x) => x.id === c.lineId);
              return (
                <li key={c.id} className="py-2 text-sm">
                  <p className="text-xs text-muted">{l ? `${t(`cat.${l.category}`)} ${l.width} × ${l.height} mm` : "—"} · {t(c.side === "client" ? "pdf.client" : "admin.role.menuisier")} · {new Date(c.at).toLocaleString(DATE_LOCALE[locale], { dateStyle: "medium", timeStyle: "short" })}</p>
                  <p className="whitespace-pre-wrap break-words">{c.body}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="print:hidden"><QuoteDiscussion quoteId={q.id} me="menuisier" canWrite={false} thread={d.thread} /></div>
    </div>
  );
}
