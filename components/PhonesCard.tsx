"use client";
import { Loader2, Phone, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import OtpInput from "./access/OtpInput";
import { useConfirm } from "./ConfirmDialog";
import { useToast } from "./Toast";
import { Field, FieldError } from "./ui";
import { ApiError, fetcher, request } from "@/lib/client";
import { errorText } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { MAX_EXTRA_PHONES } from "@/lib/model";
import { isPhone } from "@/lib/phone";
import type { PhoneRow } from "@/lib/phones";

type Sent = { to: string; devCode?: string };

// Numéros du compte : le principal (donné à l'inscription) et les supplémentaires, ajoutés ici après un code reçu sur le nouveau numéro.
// Un numéro n'appartient qu'à un seul compte : le serveur refuse celui d'un autre.
export default function PhonesCard() {
  const { t, locale } = useI18n();
  const ask = useConfirm();
  const toast = useToast();
  const { data: phones = [], mutate } = useSWR<PhoneRow[]>("/api/me/phones", fetcher, { revalidateOnFocus: false });
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("");
  const [sent, setSent] = useState<Sent | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<{ field: "phone" | "code" | "form"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const full = phones.length - 1 >= MAX_EXTRA_PHONES;

  const reset = () => { setOpen(false); setPhone(""); setLabel(""); setSent(null); setCode(""); setError(null); };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!isPhone(phone)) return setError({ field: "phone", text: t("auth.err.phone") });
    setBusy(true);
    setError(null);
    try {
      const r = await request<{ added?: boolean; to?: string; devCode?: string }>("POST", "/api/me/phones", { phone, label, lang: locale });
      if (r.added) { // vérification non exigée : le numéro est déjà ajouté
        await mutate();
        toast.success(t("ph.added"));
        reset();
      } else setSent({ to: r.to ?? "", devCode: r.devCode });
    } catch (err) {
      const c = err instanceof ApiError ? err.code : "";
      setError(c === "phone_taken" ? { field: "phone", text: t("auth.phoneTaken") } : c === "invalid_phone" ? { field: "phone", text: t("auth.err.phone") } : c === "cooldown" ? { field: "form", text: t("ph.wait") } : c === "limit" ? { field: "form", text: t("ph.limit") } : c === "channel_unavailable" ? { field: "form", text: t("ph.noSms") } : { field: "form", text: errorText(err, t) });
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (value: string) => {
    if (busy || value.length < 6) return;
    setBusy(true);
    setError(null);
    try {
      await request("POST", "/api/me/phones/confirm", { code: value, label });
      await mutate();
      toast.success(t("ph.added"));
      reset();
    } catch (err) {
      const c = err instanceof ApiError ? err.code : "";
      setCode("");
      setError(c === "wrong_code" ? { field: "code", text: t("ph.wrongCode") } : c === "no_pending" || c === "locked" ? { field: "code", text: t("ph.expired") } : c === "phone_taken" ? { field: "phone", text: t("auth.phoneTaken") } : { field: "form", text: errorText(err, t) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: PhoneRow) => {
    if (!(await ask({ message: `${t("ph.removeConfirm")} (${p.phone})`, tone: "danger", confirmLabel: t("ph.remove") }))) return;
    try {
      await request("DELETE", `/api/me/phones/${p.id}`);
      await mutate();
      toast.success(t("ph.removed"));
    } catch (err) {
      toast.error(t("toast.errorTitle"), errorText(err, t));
    }
  };

  return (
    <section className="card max-w-xl space-y-4" aria-labelledby="ph-title">
      <div>
        <h2 id="ph-title" className="text-lg font-semibold">{t("ph.title")}</h2>
        <p className="mt-1 text-sm text-muted">{t("ph.intro")}</p>
      </div>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {phones.map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-3.5 py-3">
            <Phone size={16} aria-hidden className="shrink-0 text-muted" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium tabular-nums">{p.phone}</span>
              {p.label && <span className="block text-xs text-muted">{p.label}</span>}
            </span>
            {p.primary ? (
              <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold">{t("ph.primary")}</span>
            ) : (
              <button type="button" onClick={() => remove(p)} aria-label={`${t("ph.remove")} ${p.phone}`} data-tooltip={t("ph.remove")} className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger">
                <Trash2 size={16} aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>

      {!open ? (
        <button type="button" className="btn-secondary" disabled={full} onClick={() => setOpen(true)}>
          <Plus size={16} aria-hidden />
          {full ? t("ph.limit") : t("ph.add")}
        </button>
      ) : !sent ? (
        <form onSubmit={send} noValidate className="space-y-3 rounded-xl border border-line bg-surface-2/40 p-4">
          <Field required htmlFor="ph-new" label={t("ph.number")} error={error?.field === "phone" ? error.text : undefined}>
            <input id="ph-new" type="tel" inputMode="tel" autoComplete="off" placeholder="034 00 000 00" className="input" value={phone} aria-invalid={error?.field === "phone" ? true : undefined} aria-describedby={error?.field === "phone" ? "ph-new-error" : undefined} onChange={(e) => { setPhone(e.target.value); setError(null); }} />
          </Field>
          <Field htmlFor="ph-label" label={t("ph.label")} hint={t("ph.labelHint")}>
            <input id="ph-label" maxLength={40} className="input" value={label} onChange={(e) => setLabel(e.target.value)} />
          </Field>
          {error?.field === "form" && <FieldError id="ph-form-error">{error.text}</FieldError>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn-primary">
              {busy && <Loader2 size={16} aria-hidden className="animate-spin" />}
              {t("ph.sendCode")}
            </button>
            <button type="button" className="btn-secondary" onClick={reset}>{t("fb.cancel")}</button>
          </div>
        </form>
      ) : (
        <div className="space-y-3 rounded-xl border border-line bg-surface-2/40 p-4">
          <p className="text-sm">{t("ph.codeSentTo")} <strong className="tabular-nums">{sent.to}</strong></p>
          {sent.devCode && <p className="rounded-lg bg-accent/10 px-3 py-2 text-xs text-muted">{t("vf.devCode")} <strong className="tracking-widest tabular-nums text-ink">{sent.devCode}</strong></p>}
          <OtpInput value={code} onChange={(v) => { setCode(v); setError(null); if (v.length === 6) void confirm(v); }} disabled={busy} label={t("vf.enter")} />
          {error && <FieldError id="ph-code-error">{error.text}</FieldError>}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => { setSent(null); setCode(""); setError(null); }}>{t("ph.change")}</button>
            <button type="button" className="btn-secondary" onClick={reset}>{t("fb.cancel")}</button>
          </div>
        </div>
      )}
    </section>
  );
}
