"use client";
import { BadgeCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, Field } from "@/components/ui";
import { ApiError, useProfile } from "@/lib/client";
import { fileToDataUrl } from "@/lib/image";
import { useI18n } from "@/lib/i18n";
import { SPECIALTIES } from "@/lib/model";
import type { Profile } from "@/lib/profiles";

export default function PublicProfilePage() {
  const { profile } = useProfile();
  return profile ? <Form initial={profile} /> : null;
}

function Form({ initial }: { initial: Profile }) {
  const { t } = useI18n();
  const { save } = useProfile();
  const [p, setP] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (patch: Partial<Profile>) => setP((cur) => ({ ...cur, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { verified, ...input } = p;
      void verified;
      const saved = await save(input);
      setP(saved);
      setMsg({ ok: true, text: t("pp.saved") });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError && err.code === "incomplete" ? t("pp.incomplete") : err instanceof ApiError && err.code === "invalid_body" ? t("pp.invalid") : t("common.error") });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("pp.title")}</h1>
        <div className="flex flex-wrap gap-2">
          {p.published && (
            <Link href={`/menuisiers/${p.slug}`} target="_blank" className="btn-secondary">
              <ExternalLink size={16} aria-hidden />
              {t("pp.view")}
            </Link>
          )}
          <button type="submit" className="btn-primary">
            {t("common.save")}
          </button>
        </div>
      </div>
      <p className="max-w-3xl text-sm text-muted">{t("pp.hint")}</p>
      <p role="status" className={`text-sm font-medium ${msg?.ok ? "text-ok" : "text-danger"}`}>
        {msg?.text}
      </p>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section className="card space-y-4" aria-labelledby="h-id">
          <h2 id="h-id" className="text-lg font-semibold">
            {t("pp.identity")}
          </h2>
          <div className="flex items-center gap-4">
            <Avatar name={p.displayName} src={p.logo} size={72} />
            <div className="space-y-2">
              <input id="pp-logo" type="file" accept="image/*" className="input" aria-label={t("settings.logo")} onChange={async (e) => { const f = e.target.files?.[0]; if (f) set({ logo: await fileToDataUrl(f, 256) }); }} />
              {p.logo && (
                <button type="button" className="btn-danger !min-h-9" onClick={() => set({ logo: "" })}>
                  {t("settings.clear")}
                </button>
              )}
            </div>
          </div>
          <Field htmlFor="pp-name" label={t("pp.displayName")}>
            <input id="pp-name" className="input" required maxLength={120} value={p.displayName} onChange={(e) => set({ displayName: e.target.value })} />
          </Field>
          <Field htmlFor="pp-city" label={t("dir.city")} hint={t("pp.cityHint")}>
            <input id="pp-city" className="input" maxLength={80} value={p.city} onChange={(e) => set({ city: e.target.value })} />
          </Field>
          <Field htmlFor="pp-slug" label={t("pp.slug")} hint={`/menuisiers/${p.slug}`}>
            <input id="pp-slug" className="input" pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={3} maxLength={60} value={p.slug} onChange={(e) => set({ slug: e.target.value.toLowerCase() })} />
          </Field>
        </section>

        <section className="card space-y-4" aria-labelledby="h-pres">
          <h2 id="h-pres" className="text-lg font-semibold">
            {t("pp.presentation")}
          </h2>
          <Field htmlFor="pp-bio" label={t("mp.about")}>
            <textarea id="pp-bio" className="input min-h-36" maxLength={1500} value={p.bio} onChange={(e) => set({ bio: e.target.value })} />
          </Field>
          <fieldset>
            <legend className="mb-1 text-sm font-medium">{t("mp.specialties")}</legend>
            <div className="flex flex-wrap gap-x-5">
              {SPECIALTIES.map((s) => (
                <label key={s} className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" className="size-5" checked={p.specialties.includes(s)} onChange={(e) => set({ specialties: e.target.checked ? [...p.specialties, s] : p.specialties.filter((x) => x !== s) })} />
                  {t(`spec.${s}`)}
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="card space-y-3 xl:col-span-2" aria-labelledby="h-pub">
          <h2 id="h-pub" className="text-lg font-semibold">
            {t("pp.visibility")}
          </h2>
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
            <input type="checkbox" role="switch" className="size-5" checked={p.published} onChange={(e) => set({ published: e.target.checked })} />
            {t("pp.publish")}
          </label>
          <p className="text-sm text-muted">{t("pp.publishHint")}</p>
          <p className="flex items-center gap-2 text-sm">
            <BadgeCheck size={18} aria-hidden className={p.verified ? "text-ok" : "text-muted"} />
            {p.verified ? t("pp.verifiedYes") : t("pp.verifiedNo")}
          </p>
        </section>
      </div>
    </form>
  );
}
