"use client";
import { ArrowLeft, Plus, Printer, Trash2 } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import IconButton from "./IconButton";
import QuotePaper from "./QuotePaper";
import { ErrorState } from "./Feedback";
import { useToast } from "./Toast";
import { Field } from "./ui";
import { fmt } from "@/lib/calc";
import { useQuotes, useReceipts, useSettings } from "@/lib/client";
import { errorText } from "@/lib/errors";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import { invoiceNumber, RECEIPT_METHODS, type Quote, type ReceiptMethod } from "@/lib/model";
import { totals } from "@/lib/totals";

const today = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10); // jour de Madagascar (UTC+3)

// Encaissements d'un devis et facture imprimable : le menuisier note l'acompte et les versements, la facture montre le reste à payer.
export default function Invoice({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const { quotes, loading } = useQuotes();
  const { settings } = useSettings();
  const rc = useReceipts(id);
  if (loading || !quotes || !settings) return null;
  const q = quotes.find((x) => x.id === id);
  if (!q) {
    return (
      <p className="card">
        {t("editor.notFound")} <Link href="/devis" className="text-primary underline">{t("common.back")}</Link>
      </p>
    );
  }
  if (rc.error) return <ErrorState error={rc.error} retry={rc.retry} />;
  const receipts = rc.receipts ?? [];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/devis/${q.id}/apercu`} className="btn-secondary !min-h-10">
            <ArrowLeft size={16} aria-hidden />
            {t("common.back")}
          </Link>
          <h1 className="text-xl font-bold">{t("inv.page")} · {q.number}</h1>
        </div>
        <button type="button" className="btn-primary !min-h-10" onClick={() => window.print()}>
          <Printer size={16} aria-hidden />
          {t("inv.print")}
        </button>
      </div>
      <Receipts q={q} rc={rc} />
      <QuotePaper q={q} s={settings} t={t} locale={locale} invoice={{ number: invoiceNumber(q.number), receipts }} />
    </div>
  );
}

function Receipts({ q, rc }: { q: Quote; rc: ReturnType<typeof useReceipts> }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const { ttc } = totals(q);
  const receipts = rc.receipts ?? [];
  const paid = receipts.reduce((a, r) => a + r.amount, 0);
  const due = ttc - paid;
  const deposit = Math.round((ttc * q.terms.deposit) / 100);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<ReceiptMethod>("especes");
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState(today);
  const [busy, setBusy] = useState(false);
  const cur = t("common.currency");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n = Math.round(Number(amount.replace(/\s/g, "")));
    if (!(n > 0)) return;
    setBusy(true);
    try {
      await rc.add({ amount: n, method, reference, paidOn, note: "" });
      setAmount("");
      setReference("");
    } catch (err) {
      toast.error(t("toast.errorTitle"), errorText(err, t));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (rid: string) => {
    try {
      await rc.remove(rid);
    } catch (err) {
      toast.error(t("toast.errorTitle"), errorText(err, t));
    }
  };

  return (
    <section className="card space-y-4 print:hidden" aria-labelledby="h-rc">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="h-rc" className="text-lg font-semibold">{t("rc.title")}</h2>
        <p className="text-sm">
          {t("inv.paid")} <strong>{fmt(paid)} {cur}</strong> / {fmt(ttc)} {cur} · {t("inv.due")} <strong className={due > 0 ? "text-warn" : "text-ok"}>{fmt(Math.max(0, due))} {cur}</strong>
        </p>
      </div>
      {receipts.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {receipts.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm">
              <time dateTime={r.paidOn} className="text-muted">{new Date(r.paidOn).toLocaleDateString(DATE_LOCALE[locale])}</time>
              <span>{t(`rc.m.${r.method}`)}{r.reference && <span className="ml-1 font-mono text-xs text-muted">{r.reference}</span>}</span>
              <strong className="ml-auto tabular-nums">{fmt(r.amount)} {cur}</strong>
              <IconButton label={t("rc.delete")} className="text-danger" onClick={() => remove(r.id)}><Trash2 size={16} aria-hidden /></IconButton>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <Field label={t("rc.amount")} htmlFor="rc-amount" required>
          <input id="rc-amount" inputMode="numeric" required className="input tabular-nums" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label={t("rc.method")} htmlFor="rc-method">
          <select id="rc-method" className="input" value={method} onChange={(e) => setMethod(e.target.value as ReceiptMethod)}>
            {RECEIPT_METHODS.map((m) => <option key={m} value={m}>{t(`rc.m.${m}`)}</option>)}
          </select>
        </Field>
        <Field label={t("rc.reference")} htmlFor="rc-ref">
          <input id="rc-ref" maxLength={80} className="input" value={reference} onChange={(e) => setReference(e.target.value)} />
        </Field>
        <Field label={t("rc.date")} htmlFor="rc-date" required>
          <input id="rc-date" type="date" required className="input" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
        </Field>
        <button type="submit" className="btn-primary" disabled={busy || !amount}>
          <Plus size={16} aria-hidden />
          {t("rc.add")}
        </button>
      </form>
      <div className="flex flex-wrap gap-2 text-sm">
        {paid === 0 && deposit > 0 && <button type="button" className="btn-secondary !min-h-9" onClick={() => setAmount(String(deposit))}>{t("pdf.deposit")} {q.terms.deposit} % · {fmt(deposit)}</button>}
        {paid > 0 && due > 0 && <button type="button" className="btn-secondary !min-h-9" onClick={() => setAmount(String(due))}>{t("pdf.balance")} · {fmt(due)}</button>}
      </div>
    </section>
  );
}
