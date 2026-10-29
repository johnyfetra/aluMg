"use client";
import { LoadingState, ErrorState } from "@/components/Feedback";
import Link from "next/link";
import { useState } from "react";
import SignaturePad from "@/components/SignaturePad";
import { Choice, Field } from "@/components/ui";
import { useSettings } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/lib/i18n";
import { tariffLabel } from "@/lib/describe";
import { fileToDataUrl } from "@/lib/image";
import { SURCHARGES, type Settings, TARIFF_KEYS } from "@/lib/model";

export default function SettingsPage() {
  const { settings, error, retry } = useSettings();
  return error ? <ErrorState retry={retry} /> : settings ? <Form initial={settings} /> : <LoadingState />;
}

function Form({ initial }: { initial: Settings }) {
  const { t } = useI18n();
  const { save } = useSettings();
  const [s, setS] = useState(initial);
  const toast = useToast();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (patch: Partial<Settings>) => setS((cur) => ({ ...cur, ...patch }));

  const text = (id: string, key: "company" | "address" | "phone" | "email" | "website" | "nif" | "stat" | "signer" | "paymentInfo", label: string, type = "text") => (
    <Field htmlFor={id} label={label}>
      <input id={id} type={type} className="input" value={s[key]} onChange={(e) => set({ [key]: e.target.value })} />
    </Field>
  );
  const numeric = (id: string, key: "tva" | "deposit" | "validityDays" | "minArea" | "barLength" | "kerf", label: string) => (
    <Field htmlFor={id} label={label}>
      <input id={id} type="number" inputMode="decimal" min={0} className="input" value={s[key]} onChange={(e) => set({ [key]: Number(e.target.value) || 0 })} />
    </Field>
  );
  const upload = (id: string, key: "logo" | "signature") => (
    <input
      id={id}
      type="file"
      accept="image/*"
      className="input"
      onChange={async (e) => {
        const f = e.target.files?.[0];
        if (f) set({ [key]: await fileToDataUrl(f) });
      }}
    />
  );
  const preview = (src: string, key: "logo" | "signature") => (
    <div className="mb-2 flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-16 max-w-48 rounded border border-line bg-white object-contain p-1" />
      <button type="button" className="btn-danger" onClick={() => set({ [key]: "" })}>
        {t("settings.clear")}
      </button>
    </div>
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save(s);
      setMsg(null);
      toast.success(t("toast.settingsSaved"), t("settings.saved"));
    } catch {
      setMsg({ ok: false, text: t("common.error") });
      toast.error(t("toast.errorTitle"), t("toast.errorText"));
    }
  };

  const groups = [...new Set(SURCHARGES.map((x) => x.group))];

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
        <button type="submit" className="btn-primary">
          {t("settings.save")}
        </button>
      </div>
      <p role="status" className={`text-sm font-medium ${msg?.ok ? "text-ok" : "text-danger"}`}>
        {msg?.text}
      </p>

      <div className="grid items-start gap-6 xl:grid-cols-2">
      <section className="card space-y-4" aria-labelledby="h-co">
        <h2 id="h-co" className="text-lg font-semibold">
          {t("settings.company")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {text("co", "company", t("settings.companyName"))}
          {text("ad", "address", t("settings.address"))}
          {text("ph", "phone", t("settings.phone"), "tel")}
          {text("em", "email", t("settings.email"), "email")}
          {text("web", "website", t("settings.website"))}
          {text("pay", "paymentInfo", t("settings.paymentInfo"))}
          {text("nif", "nif", t("settings.nif"))}
          {text("stat", "stat", t("settings.stat"))}
          <Field htmlFor="ac" label={t("settings.accent")}>
            <input id="ac" type="color" className="input !p-1" value={s.accent} onChange={(e) => set({ accent: e.target.value })} />
          </Field>
        </div>
        <Field htmlFor="logo" label={t("settings.logo")}>
          <>
            {s.logo && preview(s.logo, "logo")}
            {upload("logo", "logo")}
          </>
        </Field>
      </section>

      <section className="card space-y-4" aria-labelledby="h-sig">
        <h2 id="h-sig" className="text-lg font-semibold">
          {t("settings.signature")}
        </h2>
        {text("sg", "signer", t("settings.signer"))}
        {s.signature && (
          <div>
            <p className="mb-1 text-sm font-medium">{t("settings.signatureCurrent")}</p>
            {preview(s.signature, "signature")}
          </div>
        )}
        <p className="text-sm font-medium">{t("settings.signatureDraw")}</p>
        <SignaturePad onSave={(signature) => set({ signature })} />
        <Field htmlFor="sgu" label={t("settings.signatureUpload")}>
          {upload("sgu", "signature")}
        </Field>
      </section>

      <section className="card space-y-4 xl:col-span-2" aria-labelledby="h-mode">
        <h2 id="h-mode" className="text-lg font-semibold">
          {t("cost.title")}
        </h2>
        <p className="text-sm text-muted">{t("cost.hint")}</p>
        <Choice name="pricing" legend={t("cost.mode")} value={s.pricing} options={[{ value: "m2", label: t("cost.m2") }, { value: "cost", label: t("cost.cost") }]} onChange={(pricing) => set({ pricing })} />
        {s.pricing === "cost" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {([["rate", "cost.rate"], ["fixedMin", "cost.fixedMin"], ["cutMin", "cost.cutMin"], ["leafMin", "cost.leafMin"], ["glazingMin", "cost.glazingMin"]] as const).map(([k, label]) => (
                <Field key={k} htmlFor={`lb-${k}`} label={t(label)}>
                  <input id={`lb-${k}`} type="number" inputMode="decimal" min={0} className="input" value={s.labor[k]} onChange={(e) => set({ labor: { ...s.labor, [k]: Number(e.target.value) || 0 } })} />
                </Field>
              ))}
              {([["overheadPct", "cost.overheadPct"], ["marginPct", "cost.marginPct"], ["minMarginPct", "cost.minMarginPct"]] as const).map(([k, label]) => (
                <Field key={k} htmlFor={`cs-${k}`} label={t(label)}>
                  <input id={`cs-${k}`} type="number" inputMode="decimal" min={0} className="input" value={s[k]} onChange={(e) => set({ [k]: Number(e.target.value) || 0 })} />
                </Field>
              ))}
            </div>
            <p className="text-xs text-muted">{t("cost.note")}</p>
          </>
        )}
      </section>

      <section className="card space-y-4" aria-labelledby="h-pr">
        <h2 id="h-pr" className="text-lg font-semibold">
          {t("settings.pricing")}
        </h2>
        <p className="text-sm text-muted">{t("settings.pricingHint")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {TARIFF_KEYS.map((k) => (
            <Field key={k} htmlFor={`t-${k}`} label={`${tariffLabel(k, t)} (Ar/m²)`}>
              <input id={`t-${k}`} type="number" inputMode="numeric" min={0} className="input" value={s.tariffs[k]} onChange={(e) => set({ tariffs: { ...s.tariffs, [k]: Number(e.target.value) || 0 } })} />
            </Field>
          ))}
        </div>
      </section>

      <section className="card space-y-4 xl:col-span-2" aria-labelledby="h-su">
        <h2 id="h-su" className="text-lg font-semibold">
          {t("settings.surcharges")}
        </h2>
        <p className="text-sm text-muted">{t("settings.surchargesHint")}</p>
        {groups.map((g) => (
          <fieldset key={g} className="space-y-2">
            <legend className="mb-1 text-sm font-semibold">{t(g)}</legend>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SURCHARGES.filter((x) => x.group === g).map((x) => (
                <Field key={x.key} htmlFor={`s-${x.key}`} label={`${t(x.label)} (%)`}>
                  <input id={`s-${x.key}`} type="number" inputMode="decimal" className="input" value={s.surcharges[x.key] ?? 0} onChange={(e) => set({ surcharges: { ...s.surcharges, [x.key]: Number(e.target.value) || 0 } })} />
                </Field>
              ))}
            </div>
          </fieldset>
        ))}
      </section>

      <section className="card space-y-4" aria-labelledby="h-cu">
        <h2 id="h-cu" className="text-lg font-semibold">
          {t("settings.cutting")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {numeric("bar", "barLength", t("settings.barLength"))}
          {numeric("kerf", "kerf", t("settings.kerf"))}
        </div>
        <Link href="/fournisseurs" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          {t("market.link")} →
        </Link>
      </section>

      <section className="card space-y-4" aria-labelledby="h-te">
        <h2 id="h-te" className="text-lg font-semibold">
          {t("settings.terms")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {numeric("tva", "tva", t("settings.tva"))}
          {numeric("dep", "deposit", t("settings.deposit"))}
          {numeric("val", "validityDays", t("settings.validity"))}
          {numeric("min", "minArea", t("settings.minArea"))}
        </div>
      </section>

      </div>

      <button type="submit" className="btn-primary">
        {t("settings.save")}
      </button>
    </form>
  );
}
