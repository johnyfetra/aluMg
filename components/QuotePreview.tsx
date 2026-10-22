"use client";
import { ArrowLeft, FileDown, Pencil, Printer, Ruler } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import QuotePaper from "./QuotePaper";
import { StatusBadge } from "./ui";
import { useQuotes, useSettings } from "@/lib/client";
import { DATE_LOCALE, type T, useI18n } from "@/lib/i18n";
import type { Quote, Settings } from "@/lib/model";

// Visualisation du devis complet, comme il sera remis au client : entête de l'entreprise, client, ouvrages détaillés, totaux, conditions, signatures.
// La « feuille » reste blanche quel que soit le thème, pour ressembler au PDF ; l'impression ne garde que la feuille.
export default function QuotePreview({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const { quotes, loading } = useQuotes();
  const { settings } = useSettings();
  if (loading || !quotes || !settings) return null;
  const q = quotes.find((x) => x.id === id);
  if (!q) {
    return (
      <p className="card">
        {t("editor.notFound")}{" "}
        <Link href="/devis" className="text-primary underline">
          {t("common.back")}
        </Link>
      </p>
    );
  }
  return <Document q={q} s={settings} t={t} locale={locale} />;
}

function Document({ q, s, t, locale }: { q: Quote; s: Settings; t: T; locale: keyof typeof DATE_LOCALE }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pdf = async () => {
    setBusy(true);
    setError("");
    try {
      const { quotePdf } = await import("@/lib/pdf");
      await quotePdf(q, s, t, locale, false);
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/devis" className="btn-secondary !min-h-10">
            <ArrowLeft size={16} aria-hidden />
            {t("common.back")}
          </Link>
          <h1 className="text-xl font-bold">{t("preview.title")} — {q.number}</h1>
          <StatusBadge status={q.status} label={t(`status.${q.status}`)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/devis/${q.id}/profils`} className="btn-secondary !min-h-10">
            <Ruler size={16} aria-hidden />
            {t("needsPage.open")}
          </Link>
          <Link href={`/devis/${q.id}`} className="btn-secondary !min-h-10">
            <Pencil size={16} aria-hidden />
            {t("preview.edit")}
          </Link>
          <button type="button" className="btn-secondary !min-h-10" onClick={() => window.print()}>
            <Printer size={16} aria-hidden />
            {t("preview.print")}
          </button>
          <button type="button" className="btn-primary !min-h-10" onClick={pdf} disabled={busy}>
            <FileDown size={16} aria-hidden />
            {t("preview.pdf")}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="text-sm font-medium text-danger print:hidden">{error}</p>}

      <QuotePaper q={q} s={s} t={t} locale={locale} />
    </div>
  );
}
