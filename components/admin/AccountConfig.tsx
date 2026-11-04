"use client";
import { useState, type ReactNode } from "react";
import { ListSkeleton, Pager } from "@/components/admin/AdminUi";
import { QuoteRow } from "@/components/admin/QuoteRows";
import { ErrorState } from "@/components/Feedback";
import { fmt } from "@/lib/calc";
import { useAccountConfig, useAdminQuotes } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { TARIFF_KEYS } from "@/lib/model";

function Rows({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card" aria-label={title}>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <dl className="divide-y divide-line">{children}</dl>
    </section>
  );
}
const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex justify-between gap-3 py-2 text-sm"><dt className="shrink-0 text-muted">{label}</dt><dd className="min-w-0 break-words text-right font-medium">{children === "" || children == null ? "—" : children}</dd></div>
);

// Devis du compte (émis ou demandés) puis toute sa configuration, en lecture seule : réglages d'entreprise, chiffrage, tarifs, profil public.
export default function AccountConfig({ id }: { id: string }) {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const quotes = useAdminQuotes({ user: id, page: String(page) });
  const cfg = useAccountConfig(id);
  const yn = (b: boolean) => t(b ? "admin.yes" : "admin.no");
  const s = cfg.data?.settings;
  const p = cfg.data?.profile;
  return (
    <>
      <section className="space-y-3" aria-labelledby="h-acc-quotes">
        <h2 id="h-acc-quotes" className="font-semibold">{t("admin.accountQuotes")}</h2>
        {quotes.error ? <ErrorState retry={() => quotes.mutate()} /> : !quotes.data ? <ListSkeleton rows={2} /> : quotes.data.items.length === 0 ? <p className="card text-sm text-muted">{t("admin.quotesEmpty")}</p> : (
          <>
            <ul className="space-y-2 sm:space-y-0 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-line">{quotes.data.items.map((q) => <QuoteRow key={q.id} q={q} />)}</ul>
            <Pager page={quotes.data.page} pageSize={quotes.data.pageSize} total={quotes.data.total} noun={t("admin.quotesNoun")} onPage={setPage} />
          </>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="h-acc-cfg">
        <h2 id="h-acc-cfg" className="font-semibold">{t("admin.config")}</h2>
        {cfg.error ? <ErrorState retry={() => cfg.mutate()} /> : !cfg.data ? <ListSkeleton rows={3} /> : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Rows title={t("admin.cfgActivity")}>
              <Row label={t("admin.portfolio")}>{cfg.data.portfolio}</Row>
              <Row label={t("admin.contacts")}>{cfg.data.contacts}</Row>
            </Rows>
            {s && (
              <>
                <Rows title={t("settings.company")}>
                  <Row label={t("settings.companyName")}>{s.company}</Row>
                  <Row label={t("settings.address")}>{s.address}</Row>
                  <Row label={t("settings.phone")}>{s.phone}</Row>
                  <Row label={t("settings.email")}>{s.email}</Row>
                  <Row label={t("settings.website")}>{s.website}</Row>
                  <Row label={t("settings.nif")}>{s.nif}</Row>
                  <Row label={t("settings.stat")}>{s.stat}</Row>
                  <Row label={t("settings.paymentInfo")}>{s.paymentInfo}</Row>
                  <Row label={t("settings.signer")}>{s.signer}</Row>
                  <Row label={t("admin.hasLogo")}>{yn(s.hasLogo)}</Row>
                  <Row label={t("admin.hasSignature")}>{yn(s.hasSignature)}</Row>
                </Rows>
                <Rows title={t("admin.cfgBilling")}>
                  <Row label={t("admin.pricing")}>{t(`admin.pricing.${s.pricing}`)}</Row>
                  <Row label={t("settings.tva")}>{s.tva}</Row>
                  <Row label={t("settings.deposit")}>{s.deposit}</Row>
                  <Row label={t("settings.validity")}>{s.validityDays}</Row>
                  <Row label={t("settings.minArea")}>{s.minArea}</Row>
                  <Row label={t("admin.laborRate")}>{fmt(s.labor.rate)}</Row>
                  <Row label={t("admin.overhead")}>{s.overheadPct}</Row>
                  <Row label={t("admin.margin")}>{s.marginPct}</Row>
                </Rows>
                <Rows title={t("admin.cfgTariffs")}>
                  {TARIFF_KEYS.map((k) => <Row key={k} label={k}>{fmt(s.tariffs[k])}</Row>)}
                </Rows>
              </>
            )}
            {p && (
              <Rows title={t("admin.cfgProfile")}>
                <Row label={t("pp.displayName")}>{p.displayName}</Row>
                <Row label={t("pp.slug")}>{p.slug}</Row>
                <Row label={t("admin.city")}>{p.city}</Row>
                <Row label={t("admin.specialties")}>{p.specialties.join(", ")}</Row>
                <Row label={t("pp.zones")}>{p.zones.join(", ")}</Row>
                <Row label={t("pp.sinceYear")}>{p.sinceYear}</Row>
                <Row label={t("admin.published")}>{yn(p.published)}</Row>
                <Row label={t("admin.badge")}>{yn(p.verified)}</Row>
                <Row label={t("pp.presentation")}>{p.bio}</Row>
              </Rows>
            )}
            {!s && !p && <p className="card text-sm text-muted lg:col-span-2">{t("admin.cfgNone")}</p>}
          </div>
        )}
      </section>
    </>
  );
}
