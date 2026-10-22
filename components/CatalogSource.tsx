"use client";
import { BookOpen, Pencil, RotateCcw, Save, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import CatalogEditor from "./CatalogEditor";
import type { T } from "@/lib/i18n";
import type { Market } from "@/lib/model";

// D'où viennent les prix d'achat de ce devis : le catalogue général (par défaut, pour tous les devis) ou un catalogue réglé pour ce devis seulement.
export default function CatalogSource({ specific, market, general, onSave, onReset, t }: { specific: boolean; market: Market; general: Market; onSave: (m: Market) => Promise<void>; onReset: () => Promise<void>; t: T }) {
  const [draft, setDraft] = useState<Market | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  };
  const choose = (wantSpecific: boolean) => {
    if (wantSpecific === specific) return;
    if (wantSpecific) void run(() => onSave(general)); // on part d'une copie du catalogue général
    else if (confirm(t("catsrc.confirmReset"))) void run(async () => { setDraft(null); await onReset(); });
  };

  return (
    <section className="card space-y-4" aria-labelledby="h-catsrc">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 id="h-catsrc" className="flex items-center gap-2 text-lg font-semibold">
            <BookOpen size={20} aria-hidden className="text-primary" />
            {t("catsrc.title")}
          </h2>
          <p className="max-w-2xl text-sm text-muted">{t(specific ? "catsrc.hintSpecific" : "catsrc.hintGeneral")}</p>
        </div>
        <div role="radiogroup" aria-label={t("catsrc.title")} className="flex gap-1 rounded-full border border-line bg-surface p-1">
          {([false, true] as const).map((s) => (
            <button key={String(s)} type="button" role="radio" aria-checked={specific === s} disabled={busy} onClick={() => choose(s)} className={`min-h-9 rounded-full px-4 text-sm font-semibold disabled:opacity-60 ${specific === s ? "bg-primary text-on-primary shadow-sm" : "text-muted hover:text-ink"}`}>
              {t(s ? "catsrc.thisQuote" : "catsrc.general")}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}

      {!specific ? (
        <Link href="/fournisseurs" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          <Pencil size={14} aria-hidden />
          {t("catsrc.editGeneral")}
        </Link>
      ) : draft ? (
        <div className="space-y-4 border-t border-line pt-4">
          <CatalogEditor market={draft} onChange={setDraft} t={t} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" disabled={busy} onClick={() => run(async () => { await onSave(draft); setDraft(null); })}>
              <Save size={16} aria-hidden />
              {t("catsrc.saveThis")}
            </button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => setDraft(null)}>
              <X size={16} aria-hidden />
              {t("msg.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => setDraft(market)}>
            <Pencil size={16} aria-hidden />
            {t("catsrc.editThis")}
          </button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => choose(false)}>
            <RotateCcw size={16} aria-hidden />
            {t("catsrc.backGeneral")}
          </button>
        </div>
      )}
    </section>
  );
}
