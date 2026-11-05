"use client";
import { Bug, Lightbulb, LifeBuoy, Loader2, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useToast } from "./Toast";
import { Field } from "./ui";
import { ApiError, request } from "@/lib/client";
import { errorText } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { supportUrl } from "@/lib/support";
import { FEEDBACK_KINDS, FEEDBACK_MESSAGE_MAX, FEEDBACK_MESSAGE_MIN, type FeedbackKind } from "@/lib/model";

const ICONS = { bug: Bug, idea: Lightbulb, remark: MessageCircle } as const;

// Bouton de la barre du haut + fenêtre : signaler un problème, proposer une idée de fonction ou laisser une remarque. L'écran d'où l'on écrit est joint tout seul.
export default function FeedbackButton({ role }: { role: "client" | "menuisier" | "admin" }) {
  const { t } = useI18n();
  const toast = useToast();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (message.trim().length < FEEDBACK_MESSAGE_MIN) return setError(t("fb.err.short"));
    setBusy(true);
    setError("");
    try {
      await request("POST", "/api/feedback", { kind, message: message.trim(), page: location.pathname });
      toast.success(t("fb.thanks"), t("fb.thanksText"));
      setMessage("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError && err.code === "invalid_body" ? t("fb.err.short") : errorText(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={t("fb.open")} data-tooltip={t("fb.open")} className="grid size-10 place-items-center rounded-full border border-line bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-ink">
        <LifeBuoy size={18} aria-hidden />
      </button>
      <dialog ref={dialog} onClose={() => setOpen(false)} aria-labelledby="fb-title" className="m-auto w-[min(34rem,94vw)] rounded-2xl border border-line bg-surface p-0 text-ink shadow-[0_24px_64px_rgba(0,0,0,0.4)] backdrop:bg-black/60">
        <form onSubmit={submit} noValidate className="space-y-5 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="fb-title" className="text-lg font-semibold">{t("fb.title")}</h2>
              <p className="mt-1 text-sm text-muted">{t(role === "menuisier" ? "fb.introMenuisier" : "fb.intro")}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label={t("menu.close")} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink">
              <X size={18} aria-hidden />
            </button>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-1.5 text-[13px] font-medium">{t("fb.kind")}</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {FEEDBACK_KINDS.map((k) => {
                const Icon = ICONS[k];
                return (
                  <label key={k} className="cursor-pointer">
                    <input type="radio" name="kind" className="peer sr-only" checked={kind === k} onChange={() => setKind(k)} />
                    <span className="flex h-full items-start gap-2.5 rounded-xl border border-line bg-surface p-3 transition-colors hover:border-[color-mix(in_srgb,var(--muted)_50%,var(--border))] peer-checked:border-accent peer-checked:bg-accent/10 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
                      <Icon size={18} aria-hidden className={`mt-0.5 shrink-0 ${kind === k ? "text-accent" : "text-muted"}`} />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{t(`fb.kind.${k}`)}</span>
                        <span className="block text-xs leading-snug text-muted">{t(`fb.kind.${k}.hint`)}</span>
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <Field required htmlFor="fb-message" label={t("fb.msg")} error={error}>
            <textarea id="fb-message" className="input min-h-32" maxLength={FEEDBACK_MESSAGE_MAX} placeholder={t(`fb.ph.${kind}`)} value={message} aria-invalid={error ? true : undefined} aria-describedby={error ? "fb-message-error" : undefined} onChange={(e) => { setMessage(e.target.value); setError(""); }} />
            <p className="text-right text-xs text-muted">{message.length}/{FEEDBACK_MESSAGE_MAX}</p>
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <a href={supportUrl(t("support.msg"))} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-[16rem] items-start gap-2 text-xs leading-snug text-muted hover:text-ink"><MessageCircle size={14} aria-hidden className="mt-0.5 shrink-0 text-primary" />{t("support.fast")}</a>
            <div className="ml-auto flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>{t("fb.cancel")}</button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? <Loader2 size={16} aria-hidden className="animate-spin" /> : <Send size={16} aria-hidden />}
              {t("fb.send")}
            </button>
            </div>
          </div>
        </form>
      </dialog>
    </>
  );
}
