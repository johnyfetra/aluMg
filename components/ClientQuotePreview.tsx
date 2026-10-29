"use client";
import { ArrowLeft, FileDown, Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import QuotePaper from "./QuotePaper";
import { StatusBadge } from "./ui";
import { useClientQuote } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import type { Settings } from "@/lib/model";

// Le devis complet côté client : la même feuille que le PDF reçu, lisible et imprimable dans l'application.
export default function ClientQuotePreview({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const { data, isLoading } = useClientQuote(id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (isLoading) return null;
  if (!data) {
    return (
      <p className="card">
        {t("editor.notFound")}{" "}
        <Link href="/espace-client" className="text-primary underline">
          {t("common.back")}
        </Link>
      </p>
    );
  }
  const { quote: q, issuer } = data;

  const pdf = async () => {
    setBusy(true);
    setError("");
    try {
      const { quotePdf } = await import("@/lib/pdf");
      await quotePdf(q, issuer as Settings, t, locale, false); // sans la fiche de débit (usage d'atelier) : elle n'utilise que les mentions de l'entreprise
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
          <Link href={`/espace-client/devis/${q.id}`} className="btn-secondary !min-h-10">
            <ArrowLeft size={16} aria-hidden />
            {t("common.back")}
          </Link>
          <h1 className="text-xl font-bold">{t("preview.title")} · {q.number}</h1>
          <StatusBadge status={q.status} label={t(`cstatus.${q.status}`)} />
        </div>
        <div className="flex flex-wrap gap-2">
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
      <QuotePaper q={q} s={issuer} t={t} locale={locale} />
    </div>
  );
}
