"use client";
import { useEffect, useRef, useState } from "react";
import { AccessoriesEditor, GlassEditor, ProfilesEditor } from "@/components/Catalog";
import DocStyleEditor from "@/components/DocStyleEditor";
import FileDrop from "@/components/FileDrop";
import SignaturePad from "@/components/SignaturePad";
import { useToast } from "@/components/Toast";
import { Choice, Field } from "@/components/ui";
import { tariffLabel } from "@/lib/describe";
import { type Locale, useI18n } from "@/lib/i18n";
import { fileToDataUrl } from "@/lib/image";
import { SURCHARGES, type Settings, TARIFF_KEYS, type TariffUnit } from "@/lib/model";
import { setTheme, useTheme } from "@/lib/theme";
import { useSettings } from "../lib/store";

const TABS = ["company", "prices", "suppliers", "pdf", "app"] as const;
type Tab = (typeof TABS)[number];
const APP_LOCALES: Locale[] = ["fr", "en"];

// Réglages de l'application, enregistrés à chaque modification.
export default function SettingsScreen({ settings }: { settings: Settings }) {
  const { t, locale, setLocale } = useI18n();
  const theme = useTheme();
  const toast = useToast();
  const { save } = useSettings();
  const [s, setS] = useState(settings);
  const [tab, setTab] = useState<Tab>("company");
  const first = useRef(true);
  useEffect(() => {
    if (first.current) return void (first.current = false);
    try {
      save(s);
    } catch {
      toast.error(t("toast.errorTitle"), t("app.storageFull"));
    }
  }, [s]); // eslint-disable-line react-hooks/exhaustive-deps -- enregistre à chaque changement
  const set = (patch: Partial<Settings>) => setS((cur) => ({ ...cur, ...patch }));

  const text = (id: string, key: "company" | "address" | "phone" | "email" | "nif" | "stat" | "signer" | "paymentInfo", label: string, type = "text") => (
    <Field htmlFor={id} label={label}>
      <input id={id} type={type} className="input" value={s[key]} onChange={(e) => set({ [key]: e.target.value })} />
    </Field>
  );
  const numeric = (id: string, key: "tva" | "deposit" | "validityDays" | "minArea" | "kerf" | "minMarginPct", label: string) => (
    <Field htmlFor={id} label={label}>
      <input id={id} type="number" inputMode="decimal" min={0} className="input" value={s[key]} onChange={(e) => set({ [key]: Number(e.target.value) || 0 })} />
    </Field>
  );
  const image = (id: string, key: "logo" | "signature") => (
    <>
      {s[key] && (
        <div className="mb-2 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s[key]} alt="" className="h-16 max-w-48 rounded border border-line bg-white object-contain p-1" />
          <button type="button" className="btn-danger" onClick={() => set({ [key]: "" })}>{t("settings.clear")}</button>
        </div>
      )}
      <FileDrop id={id} onFile={async (f) => set({ [key]: await fileToDataUrl(f) })} />
    </>
  );
  const unitOf = (k: string): TariffUnit => s.tariffUnits?.[k] ?? "m2";
  const groups = [...new Set(SURCHARGES.map((x) => x.group))];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("nav.settings")}</h1>
      <div role="tablist" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {TABS.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`min-h-9 shrink-0 rounded-full px-4 text-sm font-semibold ${tab === k ? "bg-primary text-on-primary" : "border border-line text-muted"}`}>
            {t(`app.tab.${k}`)}
          </button>
        ))}
      </div>

      {tab === "company" && (
        <>
          <section className="card space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {text("co", "company", t("settings.companyName"))}
              {text("ad", "address", t("settings.address"))}
              {text("ph", "phone", t("settings.phone"), "tel")}
              {text("em", "email", t("settings.email"), "email")}
              {text("nif", "nif", t("settings.nif"))}
              {text("stat", "stat", t("settings.stat"))}
              {text("pay", "paymentInfo", t("settings.paymentInfo"))}
            </div>
            <Field htmlFor="logo" label={t("settings.logo")}>{image("logo", "logo")}</Field>
          </section>
          <section className="card space-y-4">
            <h2 className="text-lg font-semibold">{t("settings.signature")}</h2>
            {text("sg", "signer", t("settings.signer"))}
            {s.signature && image("sgu", "signature")}
            <p className="text-sm font-medium">{t("settings.signatureDraw")}</p>
            <SignaturePad onSave={(signature) => set({ signature })} />
          </section>
        </>
      )}

      {tab === "prices" && (
        <>
          <section className="card space-y-4">
            <Choice name="pricing" legend={t("cost.mode")} value={s.pricing} options={[{ value: "m2", label: t("app.byUnit") }, { value: "cost", label: t("cost.cost") }]} onChange={(pricing) => set({ pricing })} />
            <p className="text-sm text-muted">{t(s.pricing === "m2" ? "app.byUnitHint" : "cost.hint")}</p>
          </section>
          {s.pricing === "m2" ? (
            <section className="card space-y-3">
              <h2 className="text-lg font-semibold">{t("settings.pricing")}</h2>
              {TARIFF_KEYS.filter((k) => k !== "fenetre.oscillo").map((k) => (
                <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                  <Field htmlFor={`t-${k}`} label={tariffLabel(k, t)}>
                    <input id={`t-${k}`} type="number" inputMode="numeric" min={0} className="input" value={s.tariffs[k]} onChange={(e) => set({ tariffs: { ...s.tariffs, [k]: Number(e.target.value) || 0 } })} />
                  </Field>
                  <div role="group" aria-label={`${tariffLabel(k, t)} : ${t("app.unit")}`} className="flex rounded-lg border border-line p-0.5">
                    {(["m2", "ml"] as const).map((u) => (
                      <button key={u} type="button" aria-pressed={unitOf(k) === u} onClick={() => set({ tariffUnits: { ...s.tariffUnits, [k]: u } })} className={`min-h-10 rounded-md px-3 text-xs font-semibold ${unitOf(k) === u ? "bg-primary text-on-primary" : "text-muted"}`}>
                        {t(u === "m2" ? "cat.unit.m2" : "cat.unit.ml")}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <details className="rounded-xl border border-line p-3">
                <summary className="cursor-pointer text-sm font-semibold">{t("settings.surcharges")}</summary>
                {groups.map((g) => (
                  <fieldset key={g} className="mt-3 space-y-2">
                    <legend className="mb-1 text-sm font-semibold">{t(g)}</legend>
                    <div className="grid grid-cols-2 gap-3">
                      {SURCHARGES.filter((x) => x.group === g).map((x) => (
                        <Field key={x.key} htmlFor={`s-${x.key}`} label={`${t(x.label)} (%)`}>
                          <input id={`s-${x.key}`} type="number" inputMode="decimal" className="input" value={s.surcharges[x.key] ?? 0} onChange={(e) => set({ surcharges: { ...s.surcharges, [x.key]: Number(e.target.value) || 0 } })} />
                        </Field>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </details>
            </section>
          ) : (
            <section className="card grid gap-4 sm:grid-cols-2">
              {([["rate", "cost.rate"], ["fixedMin", "cost.fixedMin"], ["cutMin", "cost.cutMin"], ["leafMin", "cost.leafMin"], ["glazingMin", "cost.glazingMin"]] as const).map(([k, label]) => (
                <Field key={k} htmlFor={`lb-${k}`} label={t(label)}>
                  <input id={`lb-${k}`} type="number" inputMode="decimal" min={0} className="input" value={s.labor[k]} onChange={(e) => set({ labor: { ...s.labor, [k]: Number(e.target.value) || 0 } })} />
                </Field>
              ))}
              {([["overheadPct", "cost.overheadPct"], ["marginPct", "cost.marginPct"]] as const).map(([k, label]) => (
                <Field key={k} htmlFor={`cs-${k}`} label={t(label)}>
                  <input id={`cs-${k}`} type="number" inputMode="decimal" min={0} className="input" value={s[k]} onChange={(e) => set({ [k]: Number(e.target.value) || 0 })} />
                </Field>
              ))}
            </section>
          )}
          <section className="card grid gap-4 sm:grid-cols-2">
            <h2 className="text-lg font-semibold sm:col-span-2">{t("settings.terms")}</h2>
            {numeric("tva", "tva", t("settings.tva"))}
            {numeric("dep", "deposit", t("settings.deposit"))}
            {numeric("val", "validityDays", t("settings.validity"))}
            {numeric("min", "minArea", t("settings.minArea"))}
            {numeric("mm", "minMarginPct", t("cost.minMarginPct"))}
          </section>
        </>
      )}

      {tab === "suppliers" && (
        <>
          <section className="card grid gap-4 sm:grid-cols-2">{numeric("kerf", "kerf", t("settings.kerf"))}</section>
          <section className="card space-y-3 overflow-x-auto">
            <ProfilesEditor market={s.market} onChange={(market) => set({ market })} t={t} />
          </section>
          <section className="card space-y-3 overflow-x-auto">
            <AccessoriesEditor market={s.market} onChange={(market) => set({ market })} t={t} />
          </section>
          <section className="card space-y-3 overflow-x-auto">
            <GlassEditor market={s.market} onChange={(market) => set({ market })} t={t} />
          </section>
        </>
      )}

      {tab === "pdf" && (
        <>
          <section className="card">
            <Field htmlFor="ac" label={t("settings.accent")}>
              <input id="ac" type="color" className="input !p-1" value={s.accent} onChange={(e) => set({ accent: e.target.value })} />
            </Field>
          </section>
          <DocStyleEditor value={s.docStyle} onChange={(docStyle) => set({ docStyle })} issuer={s} t={t} locale={locale} />
        </>
      )}

      {tab === "app" && (
        <section className="card space-y-5">
          <Choice name="lang" legend={t("app.language")} value={APP_LOCALES.includes(locale) ? locale : "fr"} options={APP_LOCALES.map((l) => ({ value: l, label: l === "fr" ? "Français" : "English" }))} onChange={setLocale} />
          <Choice name="theme" legend={t("theme.toggle")} value={theme} options={[{ value: "light", label: t("theme.light") }, { value: "dark", label: t("theme.dark") }]} onChange={setTheme} />
          <p className="text-sm text-muted">{t("app.local")}</p>
        </section>
      )}
    </div>
  );
}
