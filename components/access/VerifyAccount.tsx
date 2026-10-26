"use client";
import { CheckCircle2, CircleAlert, Loader2, Mail, MessageSquareText, PhoneCall } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import AuthShowcase from "./AuthShowcase";
import OtpInput from "./OtpInput";
import { LangMenu, ThemeSwitch } from "../Controls";
import { ApiError, fetcher, homeFor, request, useSession } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import type { Messages } from "@/lib/messages/fr";

type Channel = "sms" | "call" | "email";
type Status = { verified: boolean; channels: Channel[]; phone: string; email: string };
type Sent = { channel: Channel; to: string; cooldownS: number; devCode?: string };

const ICON = { sms: MessageSquareText, call: PhoneCall, email: Mail } as const;
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") && !n.includes("\\") ? n : null);

// Vérification du compte : choix du canal (SMS, appel vocal, e-mail), envoi du code, saisie, renvoi différé.
export default function VerifyAccount() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { data: me, isLoading: meLoading } = useSession();
  const { data: status } = useSWR<Status>(me ? "/api/auth/verify/channels" : null, fetcher, { revalidateOnFocus: false });
  const [channel, setChannel] = useState<Channel | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);
  const [code, setCode] = useState("");
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // pas connecté → connexion ; déjà vérifié → espace de l'utilisateur
  useEffect(() => {
    if (meLoading) return;
    if (!me) router.replace("/connexion");
    else if (me.verified) router.replace(next ?? homeFor(me.role));
  }, [me, meLoading, next, router]);
  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);
  const channels = status?.channels ?? [];
  const current = channel ?? channels[0] ?? null;

  const send = async (c: Channel) => {
    setBusy(true);
    setError("");
    try {
      const r = await request<Sent>("POST", "/api/auth/verify/send", { channel: c, lang: locale });
      setSent(r);
      setCode("");
      setWait(r.cooldownS);
    } catch (e) {
      if (e instanceof ApiError && e.code === "cooldown") setWait(30);
      setError(e instanceof ApiError && (e.code === "channel_unavailable" || e.code === "no_target") ? t("vf.unavailable") : e instanceof ApiError && e.status === 429 ? t("auth.tooMany") : t("vf.sendFailed"));
    } finally {
      setBusy(false);
    }
  };
  const confirm = async (value = code) => {
    if (value.length !== 6 || busy) return;
    setBusy(true);
    setError("");
    try {
      await request("POST", "/api/auth/verify/confirm", { code: value });
      await mutate(() => true, undefined, { revalidate: true });
      router.replace(next ?? homeFor(me?.role));
    } catch (e) {
      if (e instanceof ApiError && e.code === "wrong_code") setError(t("vf.wrong"));
      else if (e instanceof ApiError && e.code === "locked") setError(t("vf.locked"));
      else if (e instanceof ApiError && e.code === "no_pending") setError(t("vf.expired"));
      else setError(t("common.error"));
      setCode("");
      setBusy(false);
    }
  };
  const logout = async () => {
    await request("POST", "/api/auth/logout");
    await mutate(() => true, undefined, { revalidate: false });
    router.replace("/connexion");
  };

  const detail = (c: Channel) => (c === "email" ? status?.email : status?.phone);

  return (
    <div className="flex min-h-screen flex-col lg:grid lg:grid-cols-2">
      <AuthShowcase variant="verify" />
      <section className="flex flex-1 flex-col px-5 py-5 sm:px-10 lg:py-8">
        <div className="flex justify-end gap-2">
          <LangMenu />
          <ThemeSwitch />
        </div>
        <div className="auth-rise m-auto my-8 w-full max-w-[27rem] space-y-6 rounded-2xl border border-line bg-surface p-6 shadow-[0_28px_70px_-30px_rgb(0_0_0/0.6)] sm:p-8">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight">{t("vf.title")}</h1>
            <p className="text-sm text-muted">{sent ? `${t("vf.sentTo")} ${sent.to}` : t("vf.sub")}</p>
          </div>

          {!status ? (
            <div className="grid place-items-center py-8 text-muted"><Loader2 className="animate-spin" aria-hidden /></div>
          ) : channels.length === 0 ? (
            <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] font-medium text-danger">{t("vf.unavailable")}</p>
          ) : !sent ? (
            <div className="space-y-4">
              <fieldset className="space-y-2">
                {channels.map((c) => {
                  const Icon = ICON[c];
                  return (
                    <label key={c} className="block cursor-pointer">
                      <input type="radio" name="channel" className="peer sr-only" checked={current === c} onChange={() => setChannel(c)} />
                      <span className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 transition-colors hover:border-[color-mix(in_srgb,var(--muted)_50%,var(--border))] peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:ring-1 peer-checked:ring-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-primary">
                        <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-lg ${current === c ? "bg-primary text-on-primary" : "bg-surface-2 text-muted"}`}><Icon size={18} /></span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{t(`vf.${c}` as keyof Messages)}</span>
                          <span className="block truncate text-xs text-muted">{t(`vf.${c}d` as keyof Messages)} · {detail(c)}</span>
                        </span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
              {error && <p role="alert" className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] font-medium text-danger"><CircleAlert size={15} aria-hidden className="mt-0.5 shrink-0" />{error}</p>}
              <button type="button" className="btn-primary w-full !min-h-11 text-[15px]" disabled={busy || !current} onClick={() => current && send(current)}>
                {busy && <Loader2 size={16} aria-hidden className="animate-spin" />}
                {t("vf.send")}
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); void confirm(); }} className="space-y-4">
              <p className="text-[13px] font-medium">{t("vf.enter")}</p>
              {sent.devCode && (
                <p className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-[13px]">
                  {t("vf.devCode")} <strong className="tracking-widest tabular-nums">{sent.devCode}</strong>
                </p>
              )}
              <OtpInput value={code} onChange={(v) => { setCode(v); if (v.length === 6) void confirm(v); }} disabled={busy} label={t("vf.enter")} />
              <div aria-live="polite" className="min-h-5">
                {error && <p role="alert" className="flex items-start gap-2 text-[13px] font-medium text-danger"><CircleAlert size={15} aria-hidden className="mt-0.5 shrink-0" />{error}</p>}
              </div>
              <button type="submit" className="btn-primary w-full !min-h-11 text-[15px]" disabled={busy || code.length !== 6}>
                {busy ? <Loader2 size={16} aria-hidden className="animate-spin" /> : <CheckCircle2 size={16} aria-hidden />}
                {t("vf.confirm")}
              </button>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                <button type="button" className="font-semibold text-primary hover:underline disabled:text-muted disabled:no-underline" disabled={wait > 0 || busy} onClick={() => send(sent.channel)}>
                  {wait > 0 ? `${t("vf.resendIn")} ${wait} s` : t("vf.resend")}
                </button>
                <button type="button" className="text-muted hover:text-ink hover:underline" onClick={() => { setSent(null); setError(""); setCode(""); }}>
                  {t("vf.change")}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm">
            <button type="button" className="text-muted hover:text-ink hover:underline" onClick={logout}>{t("vf.logout")}</button>
          </p>
        </div>
      </section>
    </div>
  );
}
