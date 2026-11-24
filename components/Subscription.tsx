"use client";
import { BadgeCheck, CircleAlert, Clock, Send, XCircle } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { ErrorState, LoadingState } from "./Feedback";
import { useToast } from "./Toast";
import { Choice, Field } from "./ui";
import { fmt } from "@/lib/calc";
import { ApiError, request, type SubscriptionView, useSubscription } from "@/lib/client";
import { errorText } from "@/lib/errors";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import { PAY_MONTHS, PAY_OPERATORS, type PayOperator, type PayStatus } from "@/lib/model";

const STATUS = { pending: { Icon: Clock, cls: "bg-warn/10 text-warn" }, confirmed: { Icon: BadgeCheck, cls: "bg-good/15 text-ok" }, rejected: { Icon: XCircle, cls: "bg-critical/15 text-danger" } } as const;

export function PayStatusBadge({ status }: { status: PayStatus }) {
  const { t } = useI18n();
  const { Icon, cls } = STATUS[status];
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}><Icon size={13} aria-hidden />{t(`pay.status.${status}`)}</span>;
}

// Bandeau de l'application : abonnement échu (seulement quand l'abonnement est activé sur la plateforme).
export function SubscriptionBanner() {
  const { t } = useI18n();
  const { data } = useSubscription();
  if (!data?.on || data.active) return null;
  return (
    <p role="status" className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-warn/40 bg-warn/10 px-4 py-2.5 text-sm font-medium">
      <CircleAlert size={16} aria-hidden className="text-warn" />
      {t("pay.expiredBanner")}
      <Link href="/abonnement" className="text-primary underline">{t("pay.renew")}</Link>
    </p>
  );
}

export default function SubscriptionPage() {
  const { t } = useI18n();
  const { data, error, isLoading, mutate } = useSubscription();
  if (error) return <ErrorState error={error} retry={() => mutate()} />;
  if (isLoading || !data) return <LoadingState />;
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("pay.title")}</h1>
        <p className="text-sm text-muted">{t("pay.sub")}</p>
      </div>
      <State s={data} />
      <Declare s={data} onDone={(next) => mutate(next, false)} />
      <History s={data} />
    </div>
  );
}

function State({ s }: { s: SubscriptionView }) {
  const { t, locale } = useI18n();
  const d = (x: string) => new Date(x).toLocaleDateString(DATE_LOCALE[locale], { day: "numeric", month: "long", year: "numeric" });
  const text = !s.on ? t("pay.free") : s.paid ? t("pay.activeUntil").replace("{d}", d(s.paidUntil!)) : s.active ? t("pay.trialUntil").replace("{d}", d(s.trialUntil)) : t("pay.expired");
  return (
    <section className={`card flex items-center gap-3 ${s.active ? "" : "border-warn/50"}`} aria-live="polite">
      {s.active ? <BadgeCheck size={22} aria-hidden className="shrink-0 text-ok" /> : <CircleAlert size={22} aria-hidden className="shrink-0 text-warn" />}
      <p className="font-semibold">{text}</p>
    </section>
  );
}

function Declare({ s, onDone }: { s: SubscriptionView; onDone: (next: SubscriptionView) => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [operator, setOperator] = useState<PayOperator>("mvola");
  const [months, setMonths] = useState<number>(1);
  const [reference, setReference] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const cur = t("common.currency");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const next = await request<SubscriptionView>("POST", "/api/billing", { operator, months, reference, payerPhone });
      onDone(next);
      setReference("");
      toast.success(t("pay.sentTitle"), t("pay.sentText"));
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "";
      setErr(code === "duplicate" ? t("pay.duplicate") : code === "too_many" ? t("pay.tooMany") : code === "invalid_body" ? t("pay.badRef") : errorText(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-4" aria-labelledby="h-pay">
      <h2 id="h-pay" className="text-lg font-semibold">{t("pay.how")}</h2>
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        <li>{t("pay.step1").replace("{amount}", `${fmt(months * s.monthly)} ${cur}`)}{s.payTo ? <strong className="ml-1">{s.payTo}</strong> : <span className="ml-1 text-muted">{t("pay.askSupport")}</span>}</li>
        <li>{t("pay.step2")}</li>
        <li>{t("pay.step3")}</li>
      </ol>
      <Choice name="pay-months" legend={t("pay.duration")} value={months} onChange={setMonths} options={PAY_MONTHS.map((m) => ({ value: m, label: `${m} ${t("svc.months")} · ${fmt(m * s.monthly)} ${cur}` }))} />
      <Choice name="pay-op" legend={t("pay.operator")} value={operator} onChange={setOperator} options={PAY_OPERATORS.map((o) => ({ value: o, label: t(`pay.op.${o}`) }))} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("pay.reference")} htmlFor="pay-ref" hint={t("pay.referenceHint")} required error={err && err === t("pay.badRef") ? err : undefined}>
          <input id="pay-ref" required autoComplete="off" autoCapitalize="characters" maxLength={60} className="input font-mono uppercase" value={reference} onChange={(e) => setReference(e.target.value)} />
        </Field>
        <Field label={t("pay.payerPhone")} htmlFor="pay-phone" hint={t("pay.payerPhoneHint")}>
          <input id="pay-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} placeholder="034 00 000 00" className="input" value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} />
        </Field>
      </div>
      {err && err !== t("pay.badRef") && <p role="alert" className="text-sm font-medium text-danger">{err}</p>}
      <button type="submit" className="btn-primary" disabled={busy || reference.trim().length < 4}>
        <Send size={16} aria-hidden />
        {t("pay.send")}
      </button>
    </form>
  );
}

function History({ s }: { s: SubscriptionView }) {
  const { t, locale } = useI18n();
  if (!s.payments.length) return null;
  return (
    <section className="card !p-0 overflow-hidden" aria-labelledby="h-pay-hist">
      <h2 id="h-pay-hist" className="border-b border-line px-4 py-3 font-semibold">{t("pay.history")}</h2>
      <ul className="divide-y divide-line">
        {s.payments.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
            <PayStatusBadge status={p.status} />
            <span className="font-mono font-semibold">{p.reference}</span>
            <span className="text-muted">{t(`pay.op.${p.operator}`)} · {fmt(p.amount)} {t("common.currency")} · {p.months} {t("svc.months")}</span>
            <time dateTime={p.createdAt} className="ml-auto text-xs text-muted">{new Date(p.createdAt).toLocaleDateString(DATE_LOCALE[locale], { dateStyle: "medium" })}</time>
            {p.status === "rejected" && p.note && <p className="w-full text-xs text-danger">{p.note}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
