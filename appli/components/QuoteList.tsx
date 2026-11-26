"use client";
import { Copy, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { newLine } from "@/components/quote/line";
import { fmt } from "@/lib/calc";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import type { Quote, Settings } from "@/lib/model";
import { totals } from "@/lib/totals";
import { go, href } from "../lib/route";
import { nextNumber, useQuotes } from "../lib/store";

// Devis vierge, numéroté et enregistré tout de suite : l'éditeur enregistre ensuite chaque modification.
export function blankQuote(settings: Settings, quotes: Quote[]): Quote {
  return {
    id: crypto.randomUUID(),
    number: nextNumber(quotes),
    date: new Date().toISOString(),
    status: "draft",
    client: { name: "", phone: "", address: "", email: "" },
    project: "",
    delay: "",
    notes: "",
    lines: [newLine(settings)],
    services: [],
    warranty: 12,
    discount: 0,
    progress: 0,
    rev: 0,
    terms: { tva: 0, deposit: settings.deposit, validityDays: settings.validityDays },
  };
}

export default function QuoteList({ quotes, settings }: { quotes: Quote[]; settings: Settings }) {
  const { t, locale } = useI18n();
  const ask = useConfirm();
  const { save, remove } = useQuotes();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const list = quotes.filter((q) => !needle || `${q.number} ${q.client.name} ${q.project}`.toLowerCase().includes(needle)).sort((a, b) => b.date.localeCompare(a.date));

  const create = () => {
    const q = blankQuote(settings, quotes);
    save(q);
    go("devis", { id: q.id });
  };
  const duplicate = (q: Quote) => {
    const copy = { ...q, id: crypto.randomUUID(), number: nextNumber(quotes), date: new Date().toISOString() };
    save(copy);
    go("devis", { id: copy.id });
  };
  const del = async (q: Quote) => {
    if (await ask({ message: t("common.confirmDelete"), tone: "danger", confirmLabel: t("common.delete") })) remove(q.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("nav.quotes")}</h1>
        <button type="button" className="btn-primary" onClick={create}>
          <Plus size={18} aria-hidden />
          {t("nav.new")}
        </button>
      </div>
      <p className="text-xs text-muted">{t("app.local")}</p>
      {quotes.length > 3 && (
        <label className="relative block">
          <span className="sr-only">{t("quotes.search")}</span>
          <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input type="search" className="input !pl-9" placeholder={t("quotes.search")} value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      )}
      {quotes.length === 0 ? (
        <div className="card space-y-4 py-10 text-center">
          <p className="text-muted">{t("quotes.empty")}</p>
          <button type="button" className="btn-primary" onClick={create}>{t("quotes.emptyCta")}</button>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {list.map((q) => (
            <li key={q.id} className="card flex items-center gap-3 !p-3.5">
              <a href={href("devis", { id: q.id })} className="min-w-0 flex-1">
                <p className="truncate font-semibold">{q.client.name || t("editor.titleNew")}</p>
                <p className="truncate text-xs text-muted">{[q.number, new Date(q.date).toLocaleDateString(DATE_LOCALE[locale]), q.project].filter(Boolean).join(" · ")}</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-primary">{fmt(totals(q).ttc)} {t("common.currency")}</p>
              </a>
              <button type="button" className="btn-secondary !min-h-10 !px-2.5" aria-label={`${t("quotes.duplicate")} ${q.number}`} onClick={() => duplicate(q)}>
                <Copy size={16} aria-hidden />
              </button>
              <button type="button" className="btn-secondary !min-h-10 !px-2.5 text-danger" aria-label={`${t("common.delete")} ${q.number}`} onClick={() => del(q)}>
                <Trash2 size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
