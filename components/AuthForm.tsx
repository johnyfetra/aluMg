"use client";
import { HardHat, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { mutate } from "swr";
import { LangMenu, ThemeSwitch } from "./Controls";
import { Field } from "./ui";
import { ApiError, homeFor, request } from "@/lib/client";
import { useI18n } from "@/lib/i18n";

// Seuls les chemins internes sont acceptés comme destination (pas de redirection vers un autre site).
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : null);

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [role, setRole] = useState<"client" | "menuisier">(params.get("role") === "menuisier" ? "menuisier" : "client");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";
  const suffix = next ? `?next=${encodeURIComponent(next)}` : "";

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const me = await request<{ role: "client" | "menuisier" | "admin" }>("POST", signup ? "/api/auth/signup" : "/api/auth/login", {
        role,
        name: f.get("name"),
        email: f.get("email"),
        phone: f.get("phone"),
        password: f.get("password"),
      });
      await mutate(() => true, undefined, { revalidate: false }); // la session a changé : on vide les caches
      router.replace(next ?? homeFor(me.role));
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      setError(code === "email_taken" ? t("auth.taken") : code === "invalid_credentials" ? t("auth.invalid") : code === "invalid_body" ? t("auth.badInput") : t("common.error"));
      setBusy(false);
    }
  };

  const roleCard = (value: "client" | "menuisier", Icon: typeof UserRound, title: string, desc: string) => (
    <label key={value} className="cursor-pointer">
      <input type="radio" name="role" className="peer sr-only" checked={role === value} onChange={() => setRole(value)} />
      <span className="flex h-full flex-col gap-1 rounded-xl border border-line bg-surface p-3 peer-checked:border-primary peer-checked:ring-2 peer-checked:ring-primary peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
        <Icon size={20} aria-hidden className="text-primary" />
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted">{desc}</span>
      </span>
    </label>
  );

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold tracking-tight text-primary">
          AluMg
        </Link>
        <div className="flex gap-2">
          <LangMenu />
          <ThemeSwitch />
        </div>
      </div>
      <p className="text-muted">{t("auth.tagline")}</p>
      <form onSubmit={submit} className="card space-y-4">
        <h1 className="text-xl font-bold">{signup ? t("auth.signupTitle") : t("auth.loginTitle")}</h1>
        {signup && (
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">{t("auth.role")}</legend>
            <div className="grid grid-cols-2 gap-3">
              {roleCard("client", UserRound, t("auth.role.client"), t("auth.role.clientDesc"))}
              {roleCard("menuisier", HardHat, t("auth.role.menuisier"), t("auth.role.menuisierDesc"))}
            </div>
          </fieldset>
        )}
        {signup && (
          <Field htmlFor="name" label={t("auth.name")}>
            <input id="name" name="name" required maxLength={80} autoComplete={role === "menuisier" ? "organization" : "name"} className="input" />
          </Field>
        )}
        <Field htmlFor="email" label={t("auth.email")}>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        </Field>
        {signup && (
          <Field htmlFor="phone" label={t("auth.phone")} hint={t("auth.phoneHint")}>
            <input id="phone" name="phone" type="tel" required pattern="\+?[0-9][0-9 ().\-]{5,22}" inputMode="tel" autoComplete="tel" placeholder="034 00 000 00" className="input" />
          </Field>
        )}
        <Field htmlFor="password" label={t("auth.password")} hint={signup ? t("auth.passwordHint") : undefined}>
          <input id="password" name="password" type="password" required minLength={signup ? 8 : 1} autoComplete={signup ? "new-password" : "current-password"} className="input" />
        </Field>
        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {signup ? t("auth.signup") : t("auth.login")}
        </button>
        <p className="text-center text-sm text-muted">
          {signup ? t("auth.haveAccount") : t("auth.noAccount")}{" "}
          <Link href={`${signup ? "/connexion" : "/inscription"}${suffix}`} className="font-semibold text-primary underline">
            {signup ? t("auth.login") : t("auth.signup")}
          </Link>
        </p>
      </form>
    </div>
  );
}
