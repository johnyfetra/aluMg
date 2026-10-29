"use client";
import { BadgeDollarSign, CircleHelp, ListChecks, MessageSquareWarning, ThumbsDown, ThumbsUp } from "lucide-react";
import { useRef, useState } from "react";
import Select from "./Select";
import { Field } from "./ui";
import { useConfirm } from "./ConfirmDialog";
import type { T } from "@/lib/i18n";
import { CHANGE_TOPICS, type ChangeTopic, LOSS_REASONS, type LossReason, type Quote } from "@/lib/model";

const TOPIC_ICON = { price: BadgeDollarSign, details: ListChecks, info: CircleHelp } as const;

// Décision du client sur un devis reçu : accepter, demander une modification (prix, détail des ouvrages ou simple question) ou refuser (avec sa raison).
// Sur mobile, les trois actions restent à portée de pouce dans une barre fixée en bas de l'écran.
export default function ClientDecision({ q, busy, pending = 0, act, t }: { q: Pick<Quote, "status">; busy: boolean; pending?: number; act: (body: Record<string, unknown>, ok: string) => Promise<boolean>; t: T }) {
  const ask = useConfirm();
  const [panel, setPanel] = useState<"change" | "reject" | null>(null);
  const [topic, setTopic] = useState<ChangeTopic>("price");
  const [message, setMessage] = useState("");
  const [discount, setDiscount] = useState("");
  const [why, setWhy] = useState<"" | LossReason>("");
  const forms = useRef<HTMLDivElement>(null);

  const open = (p: "change" | "reject") => {
    setPanel((cur) => (cur === p ? null : p));
    requestAnimationFrame(() => forms.current?.scrollIntoView({ block: "center", behavior: "smooth" }));
  };
  const accept = async () => {
    if (await ask({ message: t(pending > 0 ? "act.confirmAcceptPending" : "act.confirmAccept"), confirmLabel: t("act.accept") })) await act({ type: "accept" }, t("act.accepted"));
  };
  const done = (ok: boolean) => {
    if (!ok) return;
    setPanel(null);
    setMessage("");
    setDiscount("");
    setWhy("");
  };
  const sent = q.status === "sent";
  const canReject = sent || q.status === "negotiation";
  const wide = "btn-primary w-full";

  return (
    <>
      {sent && (
        <section className="card space-y-3 max-lg:hidden" aria-labelledby="h-dec">
          <h2 id="h-dec" className="font-semibold">{t("act.decide")}</h2>
          <p className="text-sm text-muted">{t("act.decideSub")}</p>
          <button type="button" className={wide} disabled={busy} onClick={accept}><ThumbsUp size={16} aria-hidden />{t("act.accept")}</button>
          <button type="button" className="btn-secondary w-full" onClick={() => open("change")} aria-expanded={panel === "change"}><MessageSquareWarning size={16} aria-hidden />{t("act.requestChange")}</button>
          <button type="button" className="btn-danger w-full" onClick={() => open("reject")} aria-expanded={panel === "reject"}><ThumbsDown size={16} aria-hidden />{t("act.reject")}</button>
        </section>
      )}
      {q.status === "negotiation" && (
        <section className="card space-y-3" aria-labelledby="h-neg">
          <h2 id="h-neg" className="font-semibold">{t("act.waiting")}</h2>
          <p className="text-sm text-muted">{t("act.waitingSub")}</p>
          <button type="button" className="btn-danger w-full" onClick={() => open("reject")} aria-expanded={panel === "reject"}><ThumbsDown size={16} aria-hidden />{t("act.reject")}</button>
        </section>
      )}

      <div ref={forms} className="scroll-mt-24 space-y-3">
        {panel === "change" && sent && (
          <form
            className="card space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const text = message.trim() || (Number(discount) > 0 ? `${t("act.discountAuto")} ${Number(discount)} %.` : "");
              done(await act({ type: "request_change", topic, message: text, ...(topic === "price" && Number(discount) > 0 ? { discountPercent: Number(discount) } : {}) }, t("act.changeSent")));
            }}
          >
            <fieldset className="m-0 min-w-0 border-0 p-0">
              <legend className="mb-2 text-sm font-medium">{t("act.topicLabel")}</legend>
              <div role="radiogroup" className="grid gap-2">
                {CHANGE_TOPICS.map((id) => {
                  const Icon = TOPIC_ICON[id];
                  return (
                    <button key={id} type="button" role="radio" aria-checked={topic === id} onClick={() => setTopic(id)} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${topic === id ? "border-primary bg-primary/10" : "border-line hover:bg-surface-2"}`}>
                      <Icon size={18} aria-hidden className={topic === id ? "text-primary" : "text-muted"} />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{t(`act.topic.${id}`)}</span>
                        <span className="block text-xs text-muted">{t(`act.topicHint.${id}`)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            {topic === "price" && (
              <Field htmlFor="ch-disc" label={t("act.discount")}>
                <input id="ch-disc" type="number" inputMode="decimal" min={0} max={90} className="input" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </Field>
            )}
            <Field htmlFor="ch-msg" label={t(topic === "info" ? "act.yourQuestion" : "act.changeMessage")}>
              <textarea id="ch-msg" className="input min-h-24" maxLength={1000} placeholder={t(`act.ph.${topic}`)} value={message} onChange={(e) => setMessage(e.target.value)} required={!(topic === "price" && Number(discount) > 0)} />
            </Field>
            <button type="submit" className="btn-primary w-full" disabled={busy || (!message.trim() && !(topic === "price" && Number(discount) > 0))}>{t("act.send")}</button>
          </form>
        )}
        {panel === "reject" && canReject && (
          <form
            className="card space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              done(await act({ type: "reject", ...(why ? { reason: why } : {}), ...(message.trim() ? { message: message.trim() } : {}) }, t("act.rejected")));
            }}
          >
            <Field htmlFor="rj-why" label={t("act.lossReason")} hint={t("act.lossHint")}>
              <Select id="rj-why" value={why} onChange={(v) => setWhy(v as "" | LossReason)} options={[{ value: "", label: t("loss.none") }, ...LOSS_REASONS.map((r) => ({ value: r, label: t(`loss.${r}`) }))]} />
            </Field>
            <Field htmlFor="rj-msg" label={t("act.rejectReason")}>
              <textarea id="rj-msg" className="input min-h-20" maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
            </Field>
            <button type="submit" className="btn-danger w-full" disabled={busy}>{t("act.reject")}</button>
          </form>
        )}
      </div>

      {sent && panel === null && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-stretch gap-2 border-t border-line bg-surface/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden" role="group" aria-label={t("act.decide")}>
          <button type="button" className="btn-danger !min-h-12 !px-3.5" onClick={() => open("reject")} aria-label={t("act.reject")} title={t("act.reject")}><ThumbsDown size={18} aria-hidden /></button>
          <button type="button" className="btn-secondary !min-h-12 flex-1 !px-2 text-[13px]" onClick={() => open("change")}><MessageSquareWarning size={16} aria-hidden />{t("act.requestChangeShort")}</button>
          <button type="button" className="btn-primary !min-h-12 flex-[1.2] !px-2" disabled={busy} onClick={accept}><ThumbsUp size={16} aria-hidden />{t("act.acceptShort")}</button>
        </div>
      )}
    </>
  );
}
