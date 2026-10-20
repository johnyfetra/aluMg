"use client";
import { Phone, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { fmt } from "@/lib/calc";
import { useQuotes } from "@/lib/client";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import { totals } from "@/lib/totals";

// Les clients sont déduits des devis : un compte client (identifiant) ou, à défaut, un nom + téléphone saisis à la main.
export default function ClientsPage() {
  const { t, locale } = useI18n();
  const { quotes = [], loading } = useQuotes();
  const [q, setQ] = useState("");

  const map = new Map<string, { name: string; phone: string; account: boolean; quotes: number; won: number; amount: number; last: string }>();
  for (const x of quotes) {
    const key = x.clientId ?? `${x.client.name.trim().toLowerCase()}|${x.client.phone.trim()}`;
    if (!x.clientId && !x.client.name.trim() && !x.client.phone.trim()) continue;
    const cur = map.get(key) ?? { name: x.client.name || t("quotes.noClient"), phone: x.client.phone, account: !!x.clientId, quotes: 0, won: 0, amount: 0, last: "" };
    cur.quotes += 1;
    if (["accepted", "in_progress", "completed"].includes(x.status)) {
      cur.won += 1;
      cur.amount += totals(x).ttc;
    }
    if (x.date > cur.last) cur.last = x.date;
    map.set(key, cur);
  }
  const needle = q.trim().toLowerCase();
  const list = [...map.values()].filter((c) => !needle || c.name.toLowerCase().includes(needle) || c.phone.includes(needle)).sort((a, b) => b.last.localeCompare(a.last));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("cli.title")}</h1>
      {map.size > 0 && (
        <div className="relative max-w-md">
          <Search size={18} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input type="search" aria-label={t("cli.search")} placeholder={t("cli.search")} className="input !pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}
      {!loading && map.size === 0 ? (
        <div className="card py-12 text-center text-muted">{t("cli.empty")}</div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("quotes.col.client")}</th>
                <th className="px-4 py-3 font-semibold">{t("auth.phone")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("nav.quotes")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("cli.won")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("cli.amount")}</th>
                <th className="px-4 py-3 font-semibold">{t("cli.last")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((c) => (
                <tr key={`${c.name}|${c.phone}`} className="hover:bg-surface-2/60">
                  <td className="px-4 py-3">
                    <Link href={`/devis?q=${encodeURIComponent(c.name)}`} className="font-semibold text-primary hover:underline">
                      {c.name}
                    </Link>
                    {c.account && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{t("cli.account")}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.phone && (
                      <a href={`tel:${c.phone.replace(/[^+\d]/g, "")}`} className="inline-flex items-center gap-1.5 hover:underline">
                        <Phone size={14} aria-hidden />
                        {c.phone}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{c.quotes}</td>
                  <td className="px-4 py-3 text-right">{c.won}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {fmt(c.amount)} {t("common.currency")}
                  </td>
                  <td className="px-4 py-3 text-muted">{new Date(c.last).toLocaleDateString(DATE_LOCALE[locale])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
