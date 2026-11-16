"use client";
import { CircleCheck, FileDown, MessageCircle } from "lucide-react";
import { useState } from "react";
import QuotePaper from "./QuotePaper";
import { fmt } from "@/lib/calc";
import { useI18n } from "@/lib/i18n";
import type { Settings } from "@/lib/model";
import { normalizePhone } from "@/lib/phone";
import { totals } from "@/lib/totals";
import type { ClientQuote } from "@/lib/workflow";

// Devis ouvert par le client depuis le lien WhatsApp : le total, deux gros boutons qui répondent au menuisier sur WhatsApp, le PDF, puis la feuille complète.
export default function SharedQuote({ data }: { data: ClientQuote | null }) {
  const { t, locale } = useI18n();
  const [busy, setBusy] = useState(false);
  if (!data) return <main className="mx-auto max-w-md p-6"><p className="card">{t("share.gone")}</p></main>;
  const { quote: q, issuer, menuisier: m } = data;
  const phone = (normalizePhone(m.phone) ?? "").replace(/\D/g, "");
  const wa = (text: string) => `https://wa.me/${phone}?text=${encodeURIComponent(`${text} ${q.number}${q.project ? ` (${q.project})` : ""}.`)}`;
  const pdf = async () => {
    setBusy(true);
    try {
      const { quotePdf } = await import("@/lib/pdf");
      await quotePdf(q, issuer as Settings, t, locale);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-6">
      <header className="card space-y-4">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {issuer.logo && <img src={issuer.logo} alt="" className="h-12 max-w-24 object-contain" />}
          <div className="min-w-0">
            <p className="text-sm text-muted">{t("share.from")}</p>
            <h1 className="truncate text-xl font-bold">{issuer.company}</h1>
          </div>
        </div>
        <div>
          <p className="text-sm text-muted">{q.number}{q.project ? ` · ${q.project}` : ""}</p>
          <p className="text-3xl font-bold tabular-nums">{fmt(totals(q).ttc)} {t("common.currency")}</p>
          <p className="text-sm text-muted">{t("share.total")}</p>
        </div>
        {phone && (
          <div className="grid gap-2 sm:grid-cols-2">
            <a className="btn-primary !min-h-12 text-base" href={wa(t("share.acceptMsg"))} target="_blank" rel="noopener noreferrer"><CircleCheck size={20} aria-hidden />{t("share.accept")}</a>
            <a className="btn-secondary !min-h-12 text-base" href={wa(t("share.questionMsg"))} target="_blank" rel="noopener noreferrer"><MessageCircle size={20} aria-hidden />{t("share.question")}</a>
          </div>
        )}
        <button type="button" className="btn-ghost w-full" onClick={pdf} disabled={busy}><FileDown size={18} aria-hidden />{t("preview.pdf")}</button>
      </header>
      <div className="overflow-x-auto">
        <QuotePaper q={q} s={issuer} t={t} locale={locale} />
      </div>
      <p className="text-center text-xs text-muted">{t("share.made")}</p>
    </main>
  );
}
