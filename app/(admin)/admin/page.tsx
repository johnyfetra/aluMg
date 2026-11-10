"use client";
import { Activity, CalendarCheck, Eye, FileText, Hammer, MessagesSquare, Percent, ShieldCheck, TrendingDown, TrendingUp, UserPlus, UserRound, UserX, Users } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ErrorState, LoadingState } from "@/components/Feedback";
import { Choice } from "@/components/ui";
import type { AdminStats, Unit } from "@/lib/admin";
import { useAdminStats } from "@/lib/client";
import { useI18n } from "@/lib/i18n";

// Les graphiques arrivent après les chiffres clés : un squelette tient leur place.
const SeriesChart = dynamic(() => import("@/components/admin/SeriesChart"), { ssr: false, loading: () => <div aria-hidden className="card skeleton h-64" /> });

const CHARTS = [
  { key: "visitors", label: "admin.visitors", color: "var(--primary)" },
  { key: "signups", label: "admin.signups", color: "var(--c1)" },
  { key: "logins", label: "admin.logins", color: "var(--c2)" },
  { key: "quotes", label: "admin.quotes", color: "var(--c3)" },
  { key: "completed", label: "admin.completed", color: "var(--c4)" },
] as const satisfies readonly { key: Exclude<keyof AdminStats, "users" | "kpi">; label: string; color: string }[];

function Tile({ label, value, Icon, color, hint }: { label: string; value: number; Icon: typeof Users; color: string; hint?: string }) {
  return (
    <div title={hint} className="card flex items-center gap-3 !p-3.5 sm:gap-4 sm:!p-4">
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl sm:size-12" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
        <Icon size={22} />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="text-lg font-bold leading-tight">{value}</dd>
      </div>
    </div>
  );
}

// Chiffre clé des 30 derniers jours, avec la tendance par rapport aux 30 jours d'avant (flèche + texte : jamais la couleur seule).
function Kpi({ label, value, prev, Icon, href, suffix = "" }: { label: string; value: number | null; prev?: number | null; Icon: typeof Users; href?: string; suffix?: string }) {
  const { t } = useI18n();
  const delta = value !== null && prev != null && prev > 0 ? Math.round(((value - prev) / prev) * 100) : null;
  const body = (
    <>
      <span className="flex items-center gap-2 text-xs font-medium text-muted"><Icon size={15} aria-hidden />{label}</span>
      <span className="mt-2 block text-3xl font-bold tabular-nums tracking-tight">{value === null ? "—" : `${value}${suffix}`}</span>
      {delta !== null ? (
        <span className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${delta >= 0 ? "text-ok" : "text-danger"}`}>
          {delta >= 0 ? <TrendingUp size={13} aria-hidden /> : <TrendingDown size={13} aria-hidden />}
          {delta > 0 ? "+" : ""}{delta} % <span className="font-normal text-muted">{t("admin.vsPrev")}</span>
        </span>
      ) : prev !== undefined ? <span className="mt-1 block text-xs text-muted">{t("admin.last30")}</span> : null}
    </>
  );
  return href ? <Link href={href} className="card block !p-4 transition-colors hover:border-primary/50">{body}</Link> : <div className="card !p-4">{body}</div>;
}

export default function AdminDashboard() {
  const { t } = useI18n();
  const { data, error, isLoading, mutate } = useAdminStats();
  const [unit, setUnit] = useState<Unit>("day");
  const [cumul, setCumul] = useState(false);

  return (
    <div className="space-y-6">
      <div className="page-heading">
        <h1 className="text-2xl font-bold">{t("nav.group.admin")}</h1>
        <p className="text-muted">{t("admin.subtitle")}</p>
      </div>
      {error ? <ErrorState retry={() => mutate()} /> : isLoading || !data ? <LoadingState /> : (
        <>
          <section aria-labelledby="h-kpi" className="space-y-3">
            <h2 id="h-kpi" className="font-semibold">{t("admin.kpi")} <span className="text-sm font-normal text-muted">· {t("admin.last30")}</span></h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi label={t("admin.visitors")} value={data.kpi.visitors.now} prev={data.kpi.visitors.prev} Icon={Eye} />
              <Kpi label={t("admin.views")} value={data.kpi.views.now} prev={data.kpi.views.prev} Icon={Activity} />
              <Kpi label={t("admin.signups")} value={data.kpi.signups.now} prev={data.kpi.signups.prev} Icon={UserPlus} />
              <Kpi label={t("admin.quotes")} value={data.kpi.quotes.now} prev={data.kpi.quotes.prev} Icon={FileText} />
              <Kpi label={t("admin.conversion")} value={data.kpi.conversion} Icon={Percent} suffix=" %" />
              <Kpi label={t("admin.acceptance")} value={data.kpi.acceptance} Icon={Percent} suffix=" %" />
              <Kpi label={t("admin.demosToConfirm")} value={data.kpi.demos} Icon={CalendarCheck} href="/admin/rendez-vous" />
              <Kpi label={t("admin.siteToHandle")} value={data.kpi.messages} Icon={MessagesSquare} href="/admin/messages-site" />
            </div>
          </section>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
            <Tile label={t("admin.total")} value={data.users.total} Icon={Users} color="var(--c1)" />
            <Tile label={t("admin.clients")} value={data.users.client} Icon={UserRound} color="var(--c2)" />
            <Tile label={t("admin.joiners")} value={data.users.menuisier} Icon={Hammer} color="var(--c3)" />
            <Tile label={t("admin.admins")} value={data.users.admin} Icon={ShieldCheck} color="var(--c4)" />
            <Tile label={t("admin.online")} value={data.users.online} Icon={Activity} color="var(--good)" hint={t("admin.onlineHint")} />
            <Tile label={t("admin.suspendedCount")} value={data.users.suspended} Icon={UserX} color="var(--critical)" />
          </dl>
          {/* filtres sur une seule ligne au-dessus des courbes */}
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <Choice name="admin-unit" legend={t("admin.period")} value={unit} onChange={setUnit} dense options={(["day", "month", "year"] as const).map((u) => ({ value: u, label: t(`admin.unit.${u}`) }))} />
            <Choice name="admin-cumul" legend={t("admin.view")} value={cumul ? "cumul" : "period"} onChange={(v) => setCumul(v === "cumul")} dense options={[{ value: "period", label: t("admin.perPeriod") }, { value: "cumul", label: t("admin.cumul") }]} />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            {CHARTS.map((c) => <SeriesChart key={c.key} title={t(c.label)} points={data[c.key][unit]} unit={unit} color={c.color} cumulative={cumul} base={data[c.key].base[unit]} />)}
          </div>
        </>
      )}
    </div>
  );
}
