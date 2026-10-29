"use client";
import { CircleAlert, HardHat, Loader2, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { mutate } from "swr";
import AtelierShowcase, { type Variant } from "./access/AtelierShowcase";
import Brand from "./Brand";
import PasswordField from "./access/PasswordField";
import { LangMenu, ThemeSwitch } from "./Controls";
import { Field } from "./ui";
import { ApiError, homeFor, request } from "@/lib/client";
import { useI18n } from "@/lib/i18n";

// Seuls les chemins internes sont acceptés comme destination (pas de redirection vers un autre site).
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") && !n.includes("\\") ? n : null);
type Role = "client" | "menuisier";

// Connexion et inscription : moitié présentation (AtelierShowcase), moitié formulaire.
export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [role, setRole] = useState<Role>(params.get("role") === "client" ? "client" : "menuisier");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";
  const suffix = next ? `?next=${encodeURIComponent(next)}` : "";
  const variant: Variant = signup ? role : "login";

  const enter = async (me: { role: "client" | "menuisier" | "admin"; verified?: boolean }) => {
    await mutate(() => true, undefined, { revalidate: false }); // la session a changé : on vide les caches
    // compte pas encore vérifié : SMS, appel ou e-mail d'abord
    router.replace(me.verified === false ? `/verification${suffix}` : (next ?? homeFor(me.role)));
  };
  const fail = (err: unknown) => {
    const code = err instanceof ApiError ? err.code : "";
    setError(code === "email_taken" ? t("auth.taken") : code === "phone_taken" ? t("auth.phoneTaken") : code === "invalid_credentials" ? t("auth.invalid") : code === "invalid_body" ? (signup ? t("auth.weakPassword") : t("auth.badInput")) : code === "too_many_requests" ? t("auth.tooMany") : t("common.error"));
    setBusy(false);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await enter(await request("POST", signup ? "/api/auth/signup" : "/api/auth/login", signup ? { role, name: f.get("name"), email: f.get("email"), phone: f.get("phone"), password: f.get("password") } : { identifier: f.get("identifier"), password: f.get("password") }));
    } catch (err) {
      fail(err);
    }
  };
  const demo = async (r: Role) => {
    setBusy(true);
    setError("");
    try {
      await enter(await request("POST", `/api/auth/demo-${r}`));
    } catch (err) {
      fail(err);
    }
  };

  const roleOption = (value: Role, Icon: typeof UserRound, title: string, desc: string) => (
    <label key={value} className="cursor-pointer">
      <input type="radio" name="role" className="peer sr-only" checked={role === value} onChange={() => setRole(value)} />
      <span className="flex h-full items-start gap-2.5 rounded-xl border border-line bg-surface p-3 transition-colors hover:border-[color-mix(in_srgb,var(--muted)_50%,var(--border))] peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:ring-1 peer-checked:ring-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-primary">
        <span aria-hidden className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${role === value ? "bg-primary text-on-primary" : "bg-surface-2 text-muted"}`}><Icon size={17} /></span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{title}</span>
          <span className="block text-xs leading-snug text-muted">{desc}</span>
        </span>
      </span>
    </label>
  );

  return (
    <div className="flex min-h-screen flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <AtelierShowcase variant={variant} />

      <section className="flex flex-1 flex-col px-5 py-5 sm:px-10 lg:py-8 bg-bg">
        <div className="flex justify-end gap-2">
          <LangMenu />
          <ThemeSwitch />
        </div>

        <div className="auth-form m-auto my-10 w-full max-w-[28rem] space-y-7 sm:p-4">
          <div className="hidden lg:block"><Brand /></div>
          <div className="space-y-3">
            <p className="eyebrow">{t("ui.welcome")}</p>
            <h1 className="text-3xl font-semibold tracking-tight">{signup ? t("auth.signupTitle") : t("auth.loginTitle")}</h1>
            <p className="text-sm text-muted">{signup ? t("auth.signupSub") : t("auth.loginSub")}</p>
          </div>

          <form aria-busy={busy} onSubmit={submit} className="space-y-4" noValidate={false}>
            {signup && (
              <fieldset className="space-y-2">
                <legend className="mb-1.5 text-[13px] font-medium">{t("auth.role")}</legend>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {roleOption("menuisier", HardHat, t("auth.role.menuisier"), t("auth.role.menuisierDesc"))}
                  {roleOption("client", UserRound, t("auth.role.client"), t("auth.role.clientDesc"))}
                </div>
              </fieldset>
            )}
            {signup && (
              <Field htmlFor="name" label={role === "menuisier" ? t("auth.nameCompany") : t("auth.name")}>
                <input id="name" name="name" required maxLength={80} autoComplete={role === "menuisier" ? "organization" : "name"} className="input" />
              </Field>
            )}
            {signup ? (
              <>
                <Field htmlFor="phone" label={t("auth.phoneRequired")} hint={t("auth.phoneHint2")}>
                  <input id="phone" name="phone" type="tel" required pattern="\+?[0-9][0-9 ().\-]{5,22}" inputMode="tel" autoComplete="tel" placeholder="034 00 000 00" className="input" />
                </Field>
                <Field htmlFor="email" label={t("auth.emailOptional")}>
                  <input id="email" name="email" type="email" maxLength={160} autoComplete="email" className="input" />
                </Field>
              </>
            ) : (
              <Field htmlFor="identifier" label={t("auth.identifier")}>
                <input id="identifier" name="identifier" required maxLength={160} autoComplete="username" aria-invalid={!!error} aria-describedby={error ? "auth-error" : undefined} className="input" />
              </Field>
            )}
            <PasswordField id="password" name="password" label={t("auth.password")} signup={signup} />

            {error && (
              <p id="auth-error" role="alert" className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] font-medium text-danger">
                <CircleAlert size={15} aria-hidden className="mt-0.5 shrink-0" />
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full !min-h-11 text-[15px]">
              {busy && <Loader2 size={16} aria-hidden className="animate-spin" />}
              {signup ? t("auth.signup") : t("auth.login")}
            </button>
          </form>

          {!signup && process.env.NODE_ENV !== "production" && (
            <div className="space-y-3">
              <p className="flex items-center gap-3 text-xs text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">{t("auth.or")}</p>
              <p className="text-center text-xs font-medium text-muted">{t("auth.demo.title")}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(["menuisier", "client"] as const).map((r) => (
                  <button key={r} type="button" disabled={busy} className="btn-secondary" onClick={() => demo(r)}>
                    {r === "client" ? <UserRound size={15} aria-hidden /> : <HardHat size={15} aria-hidden />}
                    {t(r === "client" ? "auth.demoClientShort" : "auth.demoMenuisierShort")}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-sm text-muted">
            {signup ? t("auth.haveAccount") : t("auth.noAccount")}{" "}
            <Link href={`${signup ? "/connexion" : "/inscription"}${suffix}`} className="font-semibold text-primary hover:underline">
              {signup ? t("auth.login") : t("auth.signup")}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
