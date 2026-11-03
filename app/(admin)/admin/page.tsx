"use client";
import { Activity, Hammer, ShieldCheck, UserRound, UserX, Users } from "lucide-react";
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
  { key: "signups", label: "admin.signups", color: "var(--c1)" },
  { key: "logins", label: "admin.logins", color: "var(--c2)" },
  { key: "quotes", label: "admin.quotes", color: "var(--c3)" },
  { key: "completed", label: "admin.completed", color: "var(--c4)" },
] as const satisfies readonly { key: Exclude<keyof AdminStats, "users">; label: string; color: string }[];

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

export default function AdminDashboard() {
  const { t } = useI18n();
  const { data, error, isLoading, mutate } = useAdminStats();
  const [unit, setUnit] = useState<Unit>("day");

  return (
    <div className="space-y-6">
      <div className="page-heading">
        <h1 className="text-2xl font-bold">{t("nav.group.admin")}</h1>
        <p className="text-muted">{t("admin.subtitle")}</p>
      </div>
      {error ? <ErrorState retry={() => mutate()} /> : isLoading || !data ? <LoadingState /> : (
        <>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
            <Tile label={t("admin.total")} value={data.users.total} Icon={Users} color="var(--c1)" />
            <Tile label={t("admin.clients")} value={data.users.client} Icon={UserRound} color="var(--c2)" />
            <Tile label={t("admin.joiners")} value={data.users.menuisier} Icon={Hammer} color="var(--c3)" />
            <Tile label={t("admin.admins")} value={data.users.admin} Icon={ShieldCheck} color="var(--c4)" />
            <Tile label={t("admin.online")} value={data.users.online} Icon={Activity} color="var(--good)" hint={t("admin.onlineHint")} />
            <Tile label={t("admin.suspendedCount")} value={data.users.suspended} Icon={UserX} color="var(--critical)" />
          </dl>
          <Choice name="admin-unit" legend={t("admin.period")} value={unit} onChange={setUnit} dense options={(["day", "month", "year"] as const).map((u) => ({ value: u, label: t(`admin.unit.${u}`) }))} />
          <div className="grid gap-6 xl:grid-cols-2">
            {CHARTS.map((c) => <SeriesChart key={c.key} title={t(c.label)} points={data[c.key][unit]} unit={unit} color={c.color} />)}
          </div>
        </>
      )}
    </div>
  );
}
