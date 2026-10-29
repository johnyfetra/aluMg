"use client";
import { ArrowRight, BellRing, TrendingDown } from "lucide-react";
import Link from "next/link";
import { fmt } from "@/lib/calc";
import type { T } from "@/lib/i18n";
import { LOSS_REASONS, type LossReason, type Quote } from "@/lib/model";
import { daysLeft, totals } from "@/lib/totals";

const SOON = 7; // jours : en dessous, un devis envoyé sans réponse est à relancer

// Devis envoyés dont la validité se termine bientôt ou est dépassée, les plus pressés d'abord.
export function FollowUp({ quotes, t }: { quotes: Quote[]; t: T }) {
  const due = quotes
    .filter((q) => q.status === "sent")
    .map((q) => ({ q, left: daysLeft(q) }))
    .filter((d) => d.left <= SOON)
    .sort((a, b) => a.left - b.left);
  if (!due.length) return null;
  return (
    <section className="card" aria-labelledby="h-follow">
      <h2 id="h-follow" className="flex items-center gap-2 font-semibold">
        <BellRing size={18} aria-hidden className="text-warn" />
        {t("dash.followTitle")} <span className="text-muted">{due.length}</span>
      </h2>
      <p className="mt-1 text-sm text-muted">{t("dash.followSub")}</p>
      <ul className="mt-3 divide-y divide-line">
        {due.slice(0, 5).map(({ q, left }) => (
          <li key={q.id}>
            <Link href={`/devis/${q.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-2 py-3 hover:bg-surface-2">
              <span className="w-32 font-semibold text-primary">{q.number}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{q.client.name || t("quotes.noClient")}</span>
              <span className={`text-xs font-semibold ${left < 0 ? "text-danger" : "text-warn"}`}>{left < 0 ? t("dash.expired") : `${left} ${t("dash.daysLeft")}`}</span>
              <ArrowRight size={16} aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Devis refusés par les clients, regroupés par raison : montre où l'on perd, sans compter les demandes que le menuisier a écartées lui-même.
export function LostQuotes({ quotes, t }: { quotes: Quote[]; t: T }) {
  const lost = quotes.filter((q) => q.status === "rejected" && q.lostReason !== "declined");
  const rows = [...LOSS_REASONS, "none" as const]
    .map((r) => {
      const list = lost.filter((q) => (r === "none" ? !q.lostReason : q.lostReason === (r satisfies LossReason)));
      return { r, n: list.length, amount: list.reduce((s, q) => s + totals(q).ttc, 0) };
    })
    .filter((x) => x.n > 0)
    .sort((a, b) => b.amount - a.amount);
  return (
    <section className="card" aria-labelledby="h-lost">
      <h2 id="h-lost" className="flex items-center gap-2 font-semibold">
        <TrendingDown size={18} aria-hidden className="text-danger" />
        {t("dash.lostTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted">{t("dash.lostSub")}</p>
      {rows.length === 0 ? (
        <p className="py-4 text-sm text-muted">{t("dash.noLost")}</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <caption className="sr-only">{t("dash.lostTitle")}</caption>
          <tbody className="divide-y divide-line">
            {rows.map(({ r, n, amount }) => (
              <tr key={r}>
                <th scope="row" className="py-2 pr-3 text-left font-medium">{t(`loss.${r}`)}</th>
                <td className="py-2 pr-3 text-right tabular-nums text-muted">{n}</td>
                <td className="py-2 text-right font-semibold tabular-nums">{fmt(amount)} {t("common.currency")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
