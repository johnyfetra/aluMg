"use client";
import { LoadingState, ErrorState } from "@/components/Feedback";
import Link from "next/link";
import { useState } from "react";
import DocStyleEditor from "@/components/DocStyleEditor";
import { useSettings } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/lib/i18n";
import type { Settings } from "@/lib/model";

// Menu dédié au design du devis : modèle, personnalisation cadrée, conformité et aperçu en direct.
export default function DocDesignPage() {
  const { settings, error, retry } = useSettings();
  return error ? <ErrorState retry={retry} /> : settings ? <Form initial={settings} /> : <LoadingState />;
}

function Form({ initial }: { initial: Settings }) {
  const { t, locale } = useI18n();
  const { save } = useSettings();
  const [s, setS] = useState(initial);
  const toast = useToast();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(s.docStyle) !== JSON.stringify(initial.docStyle);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await save({ ...initial, docStyle: s.docStyle }); // seul le modèle change : le reste des réglages reste tel qu'il est
      setMsg(null);
      toast.success(t("toast.designSaved"), t("settings.saved"));
    } catch {
      setMsg({ ok: false, text: t("common.error") });
      toast.error(t("toast.errorTitle"), t("toast.errorText"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("doc.title")}</h1>
          <p className="max-w-3xl text-sm text-muted">{t("doc.hint")}</p>
        </div>
        <button type="submit" className="btn-primary" disabled={busy || !dirty}>
          {t("doc.save")}
        </button>
      </div>
      <p role="status" className={`text-sm font-medium ${msg?.ok ? "text-ok" : "text-danger"}`}>
        {msg?.text}
      </p>
      <section className="card">
        <DocStyleEditor value={s.docStyle} onChange={(docStyle) => { setMsg(null); setS((cur) => ({ ...cur, docStyle })); }} issuer={s} t={t} locale={locale} />
      </section>
      <p className="text-sm text-muted">
        {t("doc.identityHint")}{" "}
        <Link href="/reglages" className="font-semibold text-primary underline">
          {t("nav.settings")}
        </Link>
      </p>
    </form>
  );
}
