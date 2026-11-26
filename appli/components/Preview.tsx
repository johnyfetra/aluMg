"use client";
import { ArrowLeft, Share2 } from "lucide-react";
import { useState } from "react";
import QuotePaper from "@/components/QuotePaper";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/lib/i18n";
import { type Quote, type Settings, lineSchema } from "@/lib/model";
import { href } from "../lib/route";
import { sharePdf } from "../lib/share";

// Aperçu du devis tel qu'il sera imprimé, puis PDF envoyé par la feuille de partage d'Android (WhatsApp, e-mail…).
export default function Preview({ quote, settings }: { quote: Quote; settings: Settings }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const q = { ...quote, lines: quote.lines.filter((l) => lineSchema.safeParse(l).success) };
  const pdf = async () => {
    setBusy(true);
    try {
      const { buildQuotePdf } = await import("@/lib/pdf");
      await sharePdf(await buildQuotePdf(q, settings, t, locale), `${q.number}.pdf`, `${t("editor.titleEdit")} ${q.number}`);
    } catch (e) {
      // l'utilisateur qui ferme la feuille de partage n'est pas une erreur
      if (!String(e).includes("cancel")) toast.error(t("toast.errorTitle"), t("toast.errorText"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <a href={href("devis", { id: q.id })} className="btn-secondary !min-h-10 !px-2.5" aria-label={t("common.back")}>
          <ArrowLeft size={18} aria-hidden />
        </a>
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold">{q.number}</h1>
        <button type="button" className="btn-primary !min-h-10" disabled={busy} onClick={pdf}>
          <Share2 size={16} aria-hidden />
          {t("app.sharePdf")}
        </button>
      </div>
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="min-w-[40rem]">
          <QuotePaper q={q} s={settings} t={t} locale={locale} />
        </div>
      </div>
    </div>
  );
}
