"use client";
import { ArrowRight, CheckCheck, Hammer, Hourglass, MailCheck, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, Progress, StatusBadge } from "@/components/ui";
import { fmt } from "@/lib/calc";
import { useClientQuotes, useMe } from "@/lib/client";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import type { Status } from "@/lib/model";
import { totals } from "@/lib/totals";

const GROUPS = {
  all: [] as Status[],
  waiting: ["requested", "draft"] as Status[],
  toAnswer: ["sent", "negotiation"] as Status[],
  running: ["accepted", "in_progress"] as Status[],
  done: ["completed", "rejected"] as Status[],
};

export default function ClientDashboard() {
  const { t, locale } = useI18n();
  const { data: me } = useMe();
  const { data: list = [], isLoading } = useClientQuotes();
  const [group, setGroup] = useState<keyof typeof GROUPS>("all");
  const count = (g: keyof typeof GROUPS) => list.filter((c) => GROUPS[g].includes(c.quote.status)).length;
  const shown = list.filter((c) => group === "all" || GROUPS[group].includes(c.quote.status));

  const kpis = [
    ["cl.kpi.waiting", count("waiting"), Hourglass, "var(--c3)"],
    ["cl.kpi.toAnswer", count("toAnswer"), MailCheck, "var(--c1)"],
    ["cl.kpi.running", count("running"), Hammer, "var(--c4)"],
    ["cl.kpi.done", list.filter((c) => c.quote.status === "completed").length, CheckCheck, "var(--c2)"],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {t("dash.hello")}
            {me ? `, ${me.name}` : ""}
          </h1>
          <p className="text-muted">{t("cl.subtitle")}</p>
        </div>
        <Link href="/espace-client/nouvelle" className="btn-primary">
          <Plus size={18} aria-hidden />
          {t("cl.newRequest")}
        </Link>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(([k, v, Icon, color]) => (
          <div key={k} className="card flex items-center gap-4 !p-4">
            <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
              <Icon size={22} />
            </span>
            <div>
              <dt className="text-xs text-muted">{t(k)}</dt>
              <dd className="text-2xl font-bold leading-tight">{v}</dd>
            </div>
          </div>
        ))}
      </dl>

      {!isLoading && list.length === 0 ? (
        <div className="card py-14 text-center">
          <p className="mb-4 text-muted">{t("cl.empty")}</p>
          <Link href="/menuisiers" className="btn-primary">
            {t("cl.findJoiner")}
          </Link>
        </div>
      ) : (
        <>
          <div role="group" aria-label={t("status.label")} className="flex flex-wrap gap-1.5">
            {(Object.keys(GROUPS) as (keyof typeof GROUPS)[]).map((g) => (
              <button key={g} type="button" aria-pressed={group === g} onClick={() => setGroup(g)} className={`min-h-9 rounded-full border px-3 text-sm font-medium ${group === g ? "border-primary bg-primary text-on-primary" : "border-line bg-surface hover:bg-surface-2"}`}>
                {t(`cl.group.${g}`)}
                <span className="ml-1.5 text-xs opacity-70">{g === "all" ? list.length : count(g)}</span>
              </button>
            ))}
          </div>

          <ul className="grid gap-4 xl:grid-cols-2">
            {shown.map(({ quote: q, menuisier: m }) => {
              const priced = q.status !== "requested" && q.status !== "draft";
              return (
                <li key={q.id}>
                  <Link href={`/espace-client/devis/${q.id}`} className="card block space-y-3 transition-shadow hover:shadow-lg">
                    <div className="flex items-start gap-3">
                      <Avatar name={m.name} src={m.logo} size={48} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{m.name}</p>
                        <p className="line-clamp-2 text-sm text-muted">
                          {q.number}
                          {q.project ? ` · ${q.project}` : ""} · {new Date(q.date).toLocaleDateString(DATE_LOCALE[locale])}
                        </p>
                      </div>
                      <StatusBadge status={q.status} label={t(`cstatus.${q.status}`)} />
                    </div>
                    {(q.status === "accepted" || q.status === "in_progress" || q.status === "completed") && <Progress value={q.progress} label={`${q.number} — ${t("sites.progress")}`} />}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">
                        {q.lines.length} {t("editor.lines").toLowerCase()}
                      </span>
                      {priced ? (
                        <span className="font-semibold">
                          {fmt(totals(q).ttc)} {t("common.currency")}
                        </span>
                      ) : (
                        <span className="text-muted">{t("cl.priceLater")}</span>
                      )}
                      <ArrowRight size={16} aria-hidden className="text-primary" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
