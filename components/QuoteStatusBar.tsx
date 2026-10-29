"use client";
import { StatusBadge } from "./ui";
import { fmt } from "@/lib/calc";
import { useI18n } from "@/lib/i18n";
import type { Quote } from "@/lib/model";

// Bandeau du devis, toujours visible sous la barre du haut pendant le défilement : numéro, statut, révision, avancement du chantier et total.
// `side` choisit le vocabulaire du statut (le client voit « Devis reçu », le menuisier « Envoyé »).
export default function QuoteStatusBar({ quote, total, side }: { quote: Pick<Quote, "number" | "status" | "rev" | "progress">; total: number | null; side: "menuisier" | "client" }) {
  const { t } = useI18n();
  const label = side === "client" ? t(`cstatus.${quote.status}`) : t(`status.${quote.status}`);
  const building = quote.status === "accepted" || quote.status === "in_progress" || quote.status === "completed";
  return (
    <div role="status" aria-label={`${quote.number} — ${label}`} className="sticky top-16 z-10 -mx-4 flex items-center gap-x-3 gap-y-1 border-b border-line bg-surface/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-4">
      <span className="whitespace-nowrap text-sm font-bold">{quote.number}</span>
      <StatusBadge status={quote.status} label={label} />
      {(quote.rev ?? 0) > 0 && <span className="hidden rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted sm:inline">{t("editor.revision")} {quote.rev}</span>}
      {building && (
        <span className="ml-1 hidden min-w-24 flex-1 items-center gap-2 sm:flex" aria-hidden>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full bg-c2" style={{ width: `${quote.progress}%` }} /></span>
          <span className="text-xs font-semibold tabular-nums text-muted">{quote.progress} %</span>
        </span>
      )}
      {total !== null && <span className="ml-auto whitespace-nowrap text-sm font-bold tabular-nums">{fmt(total)} <span className="text-xs font-semibold text-muted">{t("common.currency")}</span></span>}
    </div>
  );
}
