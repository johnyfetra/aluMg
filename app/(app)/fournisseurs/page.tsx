"use client";
import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import CatalogEditor from "@/components/CatalogEditor";
import { useSettings } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import type { Market, Settings } from "@/lib/model";

export default function SuppliersPage() {
  const { settings } = useSettings();
  return settings ? <Form initial={settings} /> : null;
}

// Menu « Fournisseurs » : le catalogue général du menuisier, utilisé par tous ses devis tant qu'un devis n'a pas son propre catalogue.
function Form({ initial }: { initial: Settings }) {
  const { t } = useI18n();
  const { save } = useSettings();
  const [m, setM] = useState<Market>(initial.market);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = JSON.stringify(m) !== JSON.stringify(initial.market);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save({ ...initial, market: m });
      setMsg({ ok: true, text: t("market.saved") });
    } catch {
      setMsg({ ok: false, text: t("common.error") });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{t("market.title")}</h1>
          <p className="max-w-3xl text-sm text-muted">{t("market.hint")}</p>
          <p className="max-w-3xl text-sm text-muted">{t("market.scopeGlobal")} <Link href="/devis" className="font-medium text-primary hover:underline">{t("market.scopeLink")}</Link></p>
        </div>
        <div className="flex items-center gap-3">
          <p role="status" className={`text-sm font-medium ${msg?.ok ? "text-ok" : "text-danger"}`}>
            {msg?.ok && <Check size={15} aria-hidden className="mr-1 inline" />}
            {msg?.text}
          </p>
          <button type="submit" className="btn-primary" disabled={!dirty}>
            {t("settings.save")}
          </button>
        </div>
      </div>
      <CatalogEditor market={m} onChange={setM} t={t} />
    </form>
  );
}
