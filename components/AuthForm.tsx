"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LangMenu, ThemeSwitch } from "./Controls";
import { Field } from "./ui";
import { ApiError, request } from "@/lib/client";
import { useI18n } from "@/lib/i18n";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await request("POST", signup ? "/api/auth/signup" : "/api/auth/login", {
        name: f.get("name"),
        email: f.get("email"),
        password: f.get("password"),
      });
      router.replace("/tableau-de-bord");
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      setError(code === "email_taken" ? t("auth.taken") : code === "invalid_credentials" ? t("auth.invalid") : code === "invalid_body" ? t("auth.badInput") : t("common.error"));
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold tracking-tight text-primary">AluMg</span>
        <div className="flex gap-2">
          <LangMenu />
          <ThemeSwitch />
        </div>
      </div>
      <p className="text-muted">{t("auth.tagline")}</p>
      <form onSubmit={submit} className="card space-y-4">
        <h1 className="text-xl font-bold">{signup ? t("auth.signupTitle") : t("auth.loginTitle")}</h1>
        {signup && (
          <Field htmlFor="name" label={t("auth.name")}>
            <input id="name" name="name" required maxLength={80} autoComplete="name" className="input" />
          </Field>
        )}
        <Field htmlFor="email" label={t("auth.email")}>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        </Field>
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
          <Link href={signup ? "/connexion" : "/inscription"} className="font-semibold text-primary underline">
            {signup ? t("auth.login") : t("auth.signup")}
          </Link>
        </p>
      </form>
    </div>
  );
}
