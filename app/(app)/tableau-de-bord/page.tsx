"use client";
import { ArrowRight, Hourglass, Inbox, Percent, Plus, Wallet } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Progress, StatusBadge } from "@/components/ui";
import { fmt } from "@/lib/calc";
import { useMe, useQuotes } from "@/lib/client";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import { STATUSES, type Quote, type Status } from "@/lib/model";
import { totals } from "@/lib/totals";
import { MVP } from "@/lib/mvp";

const STATUS_COLOR: Record<Status, string> = {
  requested: "var(--c3)",
  draft: "var(--bar-neutral)",
  sent: "var(--c1)",
  negotiation: "var(--warn)",
  accepted: "var(--good)",
  in_progress: "var(--c4)",
  completed: "var(--c2)",
  rejected: "var(--critical)",
};
const WON: Status[] = ["accepted", "in_progress", "completed"];

function Kpi({ label, value, Icon, color, href }: { label: string; value: ReactNode; Icon: typeof Wallet; color: string; href?: string }) {
  const body = (
    <div className="card flex items-center gap-4 !p-4 transition-shadow hover:shadow-md">
      <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
        <Icon size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="text-lg font-bold leading-tight">{value}</dd>
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function MonthlyChart({ quotes, locale, title, empty }: { quotes: Quote[]; locale: keyof typeof DATE_LOCALE; title: string; empty: string }) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1));
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const sums = new Map(months.map((m) => [key(m), 0]));
  for (const q of quotes) if (WON.includes(q.status)) {
    const k = key(new Date(q.date));
    if (sums.has(k)) sums.set(k, sums.get(k)! + totals(q).ttc);
  }
  const data = months.map((m) => ({ label: m.toLocaleDateString(DATE_LOCALE[locale], { month: "short" }), value: sums.get(key(m))! }));
  const max = Math.max(...data.map((d) => d.value));
  const compact = new Intl.NumberFormat(DATE_LOCALE[locale], { notation: "compact", maximumFractionDigits: 1 });
  const W = 600;
  const H = 220;
  const top = 24;
  const bottom = 28;
  const plotH = H - top - bottom;
  const slot = W / data.length;
  const bw = Math.min(56, slot * 0.55);

  return (
    <figure className="card">
      <figcaption className="mb-3 font-semibold">{title}</figcaption>
      {max === 0 ? (
        <p className="py-10 text-center text-sm text-muted">{empty}</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${fmt(d.value)}`).join(", ")}`} className="w-full">
          {[0, 0.5, 1].map((r) => (
            <line key={r} x1={0} x2={W} y1={top + plotH * (1 - r)} y2={top + plotH * (1 - r)} stroke="var(--grid)" strokeWidth={1} />
          ))}
          {data.map((d, i) => {
            const h = max ? (d.value / max) * plotH : 0;
            const x = i * slot + (slot - bw) / 2;
            const y = top + plotH - h;
            return (
              <g key={d.label + i}>
                <title>{`${d.label} : ${fmt(d.value)} Ar`}</title>
                {h > 0 && <path d={`M${x},${top + plotH} V${y + 4} Q${x},${y} ${x + 4},${y} H${x + bw - 4} Q${x + bw},${y} ${x + bw},${y + 4} V${top + plotH} Z`} fill="var(--c1)" />}
                {d.value > 0 && <text x={x + bw / 2} y={y - 6} textAnchor="middle" fontSize="12" fill="var(--text)">{compact.format(d.value)}</text>}
                <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--muted)">{d.label}</text>
              </g>
            );
          })}
        </svg>
      )}
    </figure>
  );
}

export default function Dashboard() {
  const { t, locale } = useI18n();
  const { data: me } = useMe();
  const { quotes = [], loading } = useQuotes();

  const inStatus = (...s: Status[]) => quotes.filter((q) => s.includes(q.status));
  const sum = (list: Quote[]) => list.reduce((a, q) => a + totals(q).ttc, 0);
  const count = (s: Status) => quotes.filter((q) => q.status === s).length;
  const requests = inStatus("requested");
  const sites = inStatus("accepted", "in_progress");
  const decided = inStatus("sent", "negotiation", ...WON, "rejected").length;
  const rate = decided ? `${Math.round((inStatus(...WON).length / decided) * 100)} %` : "—";
  const recent = [...quotes].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const cur = t("common.currency");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {t("dash.hello")}
            {me ? `, ${me.name}` : ""}
          </h1>
          <p className="text-muted">{t("dash.subtitle")}</p>
        </div>
        <Link href="/devis/nouveau" className="btn-primary">
          <Plus size={18} aria-hidden />
          {t("nav.new")}
        </Link>
      </div>

      {loading ? null : quotes.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="mb-4 text-muted">{t("dash.empty")}</p>
          <Link href="/devis/nouveau" className="btn-primary">
            {t("quotes.emptyCta")}
          </Link>
        </div>
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label={t("dash.revenue")} value={`${fmt(sum(inStatus(...WON)))} ${cur}`} Icon={Wallet} color="var(--c2)" />
            <Kpi label={t("dash.pipeline")} value={`${fmt(sum(inStatus("sent", "negotiation")))} ${cur}`} Icon={Hourglass} color="var(--c3)" />
            <Kpi label={t("dash.requests")} value={requests.length} Icon={Inbox} color="var(--c1)" href="/devis" />
            <Kpi label={t("dash.conversion")} value={rate} Icon={Percent} color="var(--c4)" />
          </dl>

          <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
            <MonthlyChart quotes={quotes} locale={locale} title={t("dash.chartTitle")} empty={t("dash.noData")} />

            <section className="card" aria-labelledby="h-status">
              <h2 id="h-status" className="mb-3 font-semibold">
                {t("dash.statusTitle")}
              </h2>
              <div className="mb-4 flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={STATUSES.map((s) => `${t(`status.${s}`)} ${count(s)}`).join(", ")}>
                {STATUSES.filter((s) => count(s) > 0).map((s) => (
                  <span key={s} style={{ flex: count(s), background: STATUS_COLOR[s] }} />
                ))}
              </div>
              <ul className="space-y-2">
                {STATUSES.map((s) => (
                  <li key={s} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      <span aria-hidden className="size-3 rounded-sm" style={{ background: STATUS_COLOR[s] }} />
                      {t(`status.${s}`)}
                    </span>
                    <span className="font-semibold">{count(s)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className={`grid gap-6 ${MVP ? "" : "xl:grid-cols-2"}`}>
            <section className="card" aria-labelledby="h-req">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="h-req" className="font-semibold">
                  {t("dash.requests")}
                </h2>
                <Link href="/devis" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  {t("dash.viewAll")}
                  <ArrowRight size={16} aria-hidden />
                </Link>
              </div>
              {requests.length === 0 ? (
                <p className="py-4 text-sm text-muted">{t("dash.noRequests")}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {requests.slice(0, 5).map((q) => (
                    <li key={q.id}>
                      <Link href={`/devis/${q.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-2 py-3 hover:bg-surface-2">
                        <span className="w-32 font-semibold text-primary">{q.number}</span>
                        <span className="min-w-0 flex-1 truncate text-sm">{q.client.name || t("quotes.noClient")}</span>
                        <span className="text-xs text-muted">{new Date(q.date).toLocaleDateString(DATE_LOCALE[locale])}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {!MVP && (
            <section className="card" aria-labelledby="h-sites">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="h-sites" className="font-semibold">
                  {t("dash.sites")}
                </h2>
                <Link href="/chantiers" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  {t("dash.viewAll")}
                  <ArrowRight size={16} aria-hidden />
                </Link>
              </div>
              {sites.length === 0 ? (
                <p className="py-4 text-sm text-muted">{t("dash.noSites")}</p>
              ) : (
                <ul className="space-y-3">
                  {sites.slice(0, 5).map((q) => (
                    <li key={q.id}>
                      <Link href={`/chantiers`} className="block rounded-lg px-2 py-2 hover:bg-surface-2">
                        <p className="mb-1 flex justify-between gap-2 text-sm">
                          <span className="font-semibold">{q.number}</span>
                          <span className="truncate text-muted">{q.client.name}</span>
                        </p>
                        <Progress value={q.progress ?? 0} label={q.number} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            )}
          </div>

          <section className="card" aria-labelledby="h-recent">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="h-recent" className="font-semibold">
                {t("dash.recent")}
              </h2>
              <Link href="/devis" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                {t("dash.viewAll")}
                <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
            <ul className="divide-y divide-line">
              {recent.map((q) => (
                <li key={q.id}>
                  <Link href={`/devis/${q.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-2 py-3 hover:bg-surface-2">
                    <span className="w-32 font-semibold text-primary">{q.number}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{q.client.name || t("quotes.noClient")}</span>
                    <span className="text-sm font-semibold">
                      {fmt(totals(q).ttc)} {cur}
                    </span>
                    <StatusBadge status={q.status} label={t(`status.${q.status}`)} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
