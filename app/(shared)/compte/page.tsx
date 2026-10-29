"use client";
import { useState } from "react";
import { Avatar, Field } from "@/components/ui";
import { compressImage } from "@/lib/image";
import { ApiError, request, useMe } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { mutate } from "swr";

export default function AccountPage() {
  const { t } = useI18n();
  const { data: me } = useMe();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!me) return null;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const newPassword = String(f.get("newPassword") ?? "");
    try {
      await request("PATCH", "/api/me", {
        name: f.get("name"),
        phone: f.get("phone"),
        ...(newPassword ? { newPassword, currentPassword: f.get("currentPassword") } : {}),
      });
      await mutate("/api/me");
      (e.target as HTMLFormElement).reset();
      setMsg({ ok: true, text: t("account.saved") });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError && err.code === "wrong_password" ? t("account.wrongPassword") : t("common.error") });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("account.title")}</h1>
      <form onSubmit={submit} className="card max-w-xl space-y-4" key={`${me.name}|${me.phone}`}>
        <h2 className="text-lg font-semibold">{t("account.profile")}</h2>
        <div className="flex items-center gap-4">
          <Avatar name={me.name} src={me.avatar} size={72} round />
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("account.photo")}</p>
            <input
              type="file"
              accept="image/*"
              className="input"
              aria-label={t("account.photo")}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  await request("PATCH", "/api/me", { avatar: await compressImage(f, 256, 0.85) });
                  await mutate("/api/me");
                  await mutate("session");
                  setMsg({ ok: true, text: t("account.saved") });
                } catch {
                  setMsg({ ok: false, text: t("common.error") });
                }
              }}
            />
            {me.avatar && (
              <button type="button" className="btn-danger !min-h-9" onClick={async () => { await request("PATCH", "/api/me", { avatar: "" }); await mutate("/api/me"); await mutate("session"); }}>
                {t("settings.clear")}
              </button>
            )}
          </div>
        </div>
        <Field htmlFor="n" label={t("account.name")}>
          <input id="n" name="name" required maxLength={80} defaultValue={me.name} className="input" />
        </Field>
        <Field htmlFor="ph" label={t("auth.phone")} hint={t("auth.phoneHint")}>
          <input id="ph" name="phone" type="tel" required pattern="\+?[0-9][0-9 ().\-]{5,22}" defaultValue={me.phone} className="input" />
        </Field>
        <Field htmlFor="e" label={t("account.email")}>
          <input id="e" value={me.email || "-"} readOnly className="input opacity-70" />
        </Field>
        <h2 className="pt-2 text-lg font-semibold">{t("account.password")}</h2>
        <Field htmlFor="cp" label={t("account.current")}>
          <input id="cp" name="currentPassword" type="password" autoComplete="current-password" className="input" />
        </Field>
        <Field htmlFor="np" label={t("account.new")} hint={t("auth.passwordHint")}>
          <input id="np" name="newPassword" type="password" minLength={8} autoComplete="new-password" className="input" />
        </Field>
        <button type="submit" className="btn-primary">
          {t("common.save")}
        </button>
        <p role="status" className={`text-sm font-medium ${msg?.ok ? "text-ok" : "text-danger"}`}>
          {msg?.text}
        </p>
      </form>
    </div>
  );
}
