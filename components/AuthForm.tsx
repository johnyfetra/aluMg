"use client";
import { CircleAlert, HardHat, Loader2, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { mutate } from "swr";
import AtelierShowcase, { type Variant } from "./access/AtelierShowcase";
import Brand from "./Brand";
import PasswordField from "./access/PasswordField";
import { LangMenu, ThemeSwitch } from "./Controls";
import { Field } from "./ui";
import { ApiError, homeFor, request } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { errorText } from "@/lib/errors";
import { isPhone } from "@/lib/phone";

// Seuls les chemins internes sont acceptés comme destination (pas de redirection vers un autre site).
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") && !n.includes("\\") ? n : null);
type Role = "client" | "menuisier";
type Errors = Partial<Record<"name" | "phone" | "email" | "identifier" | "password" | "form", string>>; // « form » : panne ou refus qui ne tient à aucun champ

// Connexion et inscription : moitié présentation (AtelierShowcase), moitié formulaire.
export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { t } = useI18n();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [role, setRole] = useState<Role>(params.get("role") === "client" ? "client" : "menuisier");
  const [errors, setErrors] = useState<Errors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";
  const suffix = next ? `?next=${encodeURIComponent(next)}` : "";
  const variant: Variant = signup ? role : "login";

  const enter = async (me: { role: "client" | "menuisier" | "admin"; verified?: boolean }) => {
    await mutate(() => true, undefined, { revalidate: false }); // la session a changé : on vide les caches
    if (signup) try { localStorage.setItem("alumg.guide.new", "1"); } catch {} // le guide ne s'ouvre seul qu'après la création du compte
    // compte pas encore vérifié : SMS, appel ou e-mail d'abord
    // navigation complète (pas router.replace) : le cache du routeur peut garder la redirection vers /connexion préchargée quand on était déconnecté
    window.location.replace(me.verified === false ? `/verification${suffix}` : (next ?? homeFor(me.role)));
  };
  // Un message court sous le champ concerné ; le bandeau du bas ne sert qu'aux pannes (réseau, serveur, trop d'essais, compte suspendu).
  const show = (e: Errors) => {
    setErrors(e);
    setBusy(false);
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
  };
  const clear = (k: keyof Errors) => setErrors((e) => (e[k] || e.form ? { ...e, [k]: undefined, form: undefined } : e));
  const nameMsg = t(role === "menuisier" ? "auth.err.nameCompany" : "auth.err.name");

  // Les mêmes règles que le serveur, sans la bulle native du navigateur (formulaire en noValidate) : mêmes mots en français, anglais et malgache.
  const validate = (f: FormData): Errors => {
    const v = (k: string) => String(f.get(k) ?? "").trim();
    const pw = String(f.get("password") ?? "");
    if (signup) {
      return {
        name: v("name") ? undefined : nameMsg,
        phone: isPhone(v("phone")) ? undefined : t("auth.err.phone"),
        email: !v("email") || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v("email")) ? undefined : t("auth.err.email"),
        password: pw.length >= 8 ? undefined : t("auth.err.password"),
      };
    }
    return { identifier: v("identifier") ? undefined : t("auth.err.identifier"), password: pw ? undefined : t("auth.err.passwordRequired") };
  };
  const hasErrors = (e: Errors) => Object.values(e).some(Boolean);

  // Réponse du serveur : « invalid_body » liste les champs en cause (« phone: … ») ; on les range sous le bon champ.
  const fail = (err: unknown) => {
    const code = err instanceof ApiError ? err.code : "";
    if (code === "email_taken") return show({ email: t("auth.taken") });
    if (code === "phone_taken") return show({ phone: t("auth.phoneTaken") });
    if (code === "invalid_credentials") return show({ password: t("auth.invalid") });
    if (code === "invalid_body" && err instanceof ApiError) {
      const e: Errors = {};
      for (const issue of err.issues) {
        const [field, ...msg] = issue.split(":");
        if (!signup) continue;
        if (field === "name") e.name = nameMsg;
        else if (field === "phone") e.phone = t("auth.err.phone");
        else if (field === "email") e.email = t("auth.err.email");
        else if (field === "password") e.password = /common_password|too_simple/.test(msg.join(":")) ? t("auth.err.passwordWeak") : t("auth.err.password");
      }
      return show(hasErrors(e) ? e : { form: t("auth.badInput") });
    }
    show({ form: code === "suspended" ? t("auth.suspended") : code === "too_many_requests" ? t("auth.tooMany") : errorText(err, t) });
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const problems = validate(f);
    if (hasErrors(problems)) return show(problems);
    setBusy(true);
    setErrors({});
    try {
      await enter(await request("POST", signup ? "/api/auth/signup" : "/api/auth/login", signup ? { role, name: f.get("name"), email: f.get("email"), phone: f.get("phone"), password: f.get("password") } : { identifier: f.get("identifier"), password: f.get("password") }));
    } catch (err) {
      fail(err);
    }
  };
  const demo = async (r: Role | "admin") => {
    setBusy(true);
    setErrors({});
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
        <div className="sticky top-0 z-30 -mx-5 -mt-5 flex justify-end gap-1.5 bg-bg/85 px-5 py-2 backdrop-blur sm:-mx-10 sm:px-10 lg:-mt-8">
          <LangMenu compact />
          <ThemeSwitch compact />
        </div>

        <div className="auth-form m-auto my-10 w-full max-w-[28rem] space-y-7 sm:p-4">
          <div className="hidden lg:block"><Link href="/" aria-label={t("auth.back")} className="inline-block rounded-lg"><Brand /></Link></div>
          <div className="space-y-3">
            <p className="eyebrow">{t("ui.welcome")}</p>
            <h1 className="text-3xl font-semibold tracking-tight">{signup ? t("auth.signupTitle") : t("auth.loginTitle")}</h1>
            <p className="text-sm text-muted">{signup ? t("auth.signupSub") : t("auth.loginSub")}</p>
          </div>

          <form ref={formRef} aria-busy={busy} onSubmit={submit} className="space-y-4" noValidate>
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
              <Field required htmlFor="name" label={role === "menuisier" ? t("auth.nameCompany") : t("auth.name")} error={errors.name}>
                <input id="name" name="name" required maxLength={80} autoComplete={role === "menuisier" ? "organization" : "name"} className="input" aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? "name-error" : undefined} onInput={() => clear("name")} />
              </Field>
            )}
            {signup ? (
              <>
                <Field required htmlFor="phone" label={t("auth.phoneRequired")} hint={t("auth.phoneHint2")} error={errors.phone}>
                  <input id="phone" name="phone" type="tel" required inputMode="tel" autoComplete="tel" placeholder="034 00 000 00" className="input" aria-invalid={errors.phone ? true : undefined} aria-describedby={errors.phone ? "phone-error" : undefined} onInput={() => clear("phone")} />
                </Field>
                <Field htmlFor="email" label={t("auth.emailOptional")} error={errors.email}>
                  <input id="email" name="email" type="email" maxLength={160} autoComplete="email" className="input" aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? "email-error" : undefined} onInput={() => clear("email")} />
                </Field>
              </>
            ) : (
              <Field required htmlFor="identifier" label={t("auth.identifier")} error={errors.identifier}>
                <input id="identifier" name="identifier" required maxLength={160} autoComplete="username" aria-invalid={errors.identifier || errors.password === t("auth.invalid") ? true : undefined} aria-describedby={errors.identifier ? "identifier-error" : undefined} className="input" onInput={() => clear("identifier")} />
              </Field>
            )}
            <PasswordField id="password" name="password" label={t("auth.password")} signup={signup} error={errors.password} onInput={() => clear("password")} />

            {errors.form && (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] font-medium text-danger">
                <CircleAlert size={15} aria-hidden className="mt-0.5 shrink-0" />
                {errors.form}
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
                <button type="button" disabled={busy} className="btn-secondary sm:col-span-2" onClick={() => demo("admin")}>
                  <ShieldCheck size={15} aria-hidden />
                  {t("auth.demoAdminShort")}
                </button>
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
