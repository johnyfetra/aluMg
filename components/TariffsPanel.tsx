"use client";
import { BadgePercent, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { mutate } from "swr";
import { NumField } from "./Catalog";
import { useToast } from "./Toast";
import { ApiError, request, useContacts, useSettings } from "@/lib/client";
import { tariffLabel } from "@/lib/describe";
import { useI18n } from "@/lib/i18n";
import { SERVICE_KINDS, type Settings, TARIFF_KEYS } from "@/lib/model";

export const openTariffs = () => window.dispatchEvent(new Event("alumg:tariffs"));

// Raccourci « Mes tarifs » : tarifs des produits (au m²), prix et coût des prestations, remise habituelle de chaque client.
// S'ouvre de partout (en-tête, menu mobile, éditeur de devis) ; enregistre sans quitter la page.
export default function TariffsPanel() {
  const { t } = useI18n();
  const toast = useToast();
  const { settings, save } = useSettings();
  const { data: contacts = [] } = useContacts();
  const [open, setOpen] = useState(false);
  // seules les valeurs modifiées sont gardées ; le reste vient de l'enregistré (vidé à chaque ouverture)
  const [edits, setEdits] = useState<{ tariffs: Record<string, number>; prices: Record<string, { price: number; cost: number }>; disc: Record<string, number> }>({ tariffs: {}, prices: {}, disc: {} });
  const [busy, setBusy] = useState(false);
  const panel = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const on = () => {
      setEdits({ tariffs: {}, prices: {}, disc: {} });
      setOpen(true);
    };
    window.addEventListener("alumg:tariffs", on);
    return () => window.removeEventListener("alumg:tariffs", on);
  }, []);
  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open, settings]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector("dialog[open]") && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", esc); };
  }, [open]);

  if (!open || !settings) return null;
  const cost = settings.pricing === "cost";
  const tariffs: Settings["tariffs"] = { ...settings.tariffs, ...edits.tariffs };
  const prices: Record<string, { price: number; cost: number }> = { ...settings.servicePrices, ...edits.prices };
  const disc: Record<string, number> = { ...Object.fromEntries(contacts.map((c) => [c.id, c.discount])), ...edits.disc };
  const changedContacts = contacts.filter((c) => (disc[c.id] ?? c.discount) !== c.discount);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await save({ ...settings, tariffs, servicePrices: prices });
      for (const c of changedContacts) await request("PUT", `/api/contacts/${c.id}`, { name: c.name, phone: c.phone, email: c.email, note: c.note, discount: disc[c.id] });
      if (changedContacts.length) await mutate("/api/contacts");
      toast.success(t("toast.tariffsSaved"), changedContacts.length ? `${changedContacts.length} ${t("tariffs.discountsUpdated")}` : t("toast.tariffsSavedText"));
      setOpen(false);
    } catch (err) {
      toast.error(t("toast.errorTitle"), err instanceof ApiError ? t("common.error") : t("toast.errorText"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-hidden />
      <form ref={panel} tabIndex={-1} onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="h-tariffs" className="relative flex h-dvh w-full flex-col bg-surface shadow-2xl outline-none sm:max-w-md sm:rounded-l-3xl">
        <header className="flex items-center gap-3 border-b border-line px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
          <span aria-hidden className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary"><BadgePercent size={20} /></span>
          <div className="min-w-0 flex-1">
            <h2 id="h-tariffs" className="text-lg font-semibold leading-tight">{t("tariffs.title")}</h2>
            <p className="text-xs text-muted">{t("tariffs.sub")}</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label={t("toast.close")} className="grid size-10 place-items-center rounded-full hover:bg-surface-2"><X size={18} aria-hidden /></button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6">
          <section aria-labelledby="h-tp">
            <h3 id="h-tp" className="mb-1 text-sm font-semibold">{t("tariffs.products")}</h3>
            <p className="mb-3 text-xs text-muted">{cost ? t("tariffs.costMode") : t("tariffs.m2Mode")}</p>
            <ul className="space-y-2">
              {TARIFF_KEYS.map((k) => (
                <li key={k} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 text-sm">{tariffLabel(k, t)}</span>
                  <span className="w-40 shrink-0"><NumField label={`${tariffLabel(k, t)} (Ar/m²)`} unit="Ar/m²" value={tariffs[k] ?? 0} onChange={(v) => setEdits((e) => ({ ...e, tariffs: { ...e.tariffs, [k]: v } }))} /></span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="h-sv">
            <h3 id="h-sv" className="mb-1 text-sm font-semibold">{t("tariffs.services")}</h3>
            <p className="mb-3 text-xs text-muted">{t("tariffs.servicesHint")}</p>
            <ul className="space-y-3">
              {SERVICE_KINDS.map((k) => (
                <li key={k}>
                  <p className="mb-1 text-sm">{t(`svc.${k}`)}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <NumField label={`${t(`svc.${k}`)}, ${t("tariffs.price")}`} unit={`Ar · ${t("tariffs.price")}`} value={prices[k]?.price ?? 0} onChange={(v) => setEdits((e) => ({ ...e, prices: { ...e.prices, [k]: { price: v, cost: prices[k]?.cost ?? 0 } } }))} />
                    <NumField label={`${t(`svc.${k}`)}, ${t("svc.cost")}`} unit={`Ar · ${t("tariffs.cost")}`} value={prices[k]?.cost ?? 0} onChange={(v) => setEdits((e) => ({ ...e, prices: { ...e.prices, [k]: { price: prices[k]?.price ?? 0, cost: v } } }))} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="h-dc">
            <h3 id="h-dc" className="mb-1 text-sm font-semibold">{t("tariffs.discounts")}</h3>
            <p className="mb-3 text-xs text-muted">{t("tariffs.discountsHint")}</p>
            {contacts.length === 0 ? (
              <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">{t("tariffs.noClients")} <Link href="/clients" onClick={() => setOpen(false)} className="font-semibold text-primary hover:underline">{t("nav.clients")}</Link></p>
            ) : (
              <ul className="space-y-2">
                {contacts.map((c) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                    <span className="w-28 shrink-0"><NumField label={`${c.name}, ${t("ct.discount")}`} unit="%" value={disc[c.id] ?? 0} onChange={(v) => setEdits((e) => ({ ...e, disc: { ...e.disc, [c.id]: Math.min(100, Math.round(v)) } }))} /></span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <footer className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <Link href="/reglages" onClick={() => setOpen(false)} className="text-sm font-semibold text-primary hover:underline">{t("tariffs.allSettings")}</Link>
          <button type="submit" className="btn-primary ml-auto" disabled={busy}>{t("settings.save")}</button>
        </footer>
      </form>
    </div>
  );
}
