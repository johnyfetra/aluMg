"use client";
import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { mutate } from "swr";
import Timeline from "@/components/Timeline";
import { Progress, StatusBadge } from "@/components/ui";
import { fmt } from "@/lib/calc";
import { ApiError, request, useQuotes } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import type { Quote } from "@/lib/model";
import { totals } from "@/lib/totals";

const SITE_STATUSES = ["accepted", "in_progress", "completed"] as const;

export default function SitesPage() {
  const { t } = useI18n();
  const { quotes = [], loading } = useQuotes();
  const sites = quotes.filter((q) => (SITE_STATUSES as readonly string[]).includes(q.status)).sort((a, b) => Number(a.status === "completed") - Number(b.status === "completed") || b.date.localeCompare(a.date));
  const running = sites.filter((q) => q.status !== "completed").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("sites.title")}</h1>
        <p className="text-muted">
          {running} {t("sites.running")}
        </p>
      </div>
      {!loading && sites.length === 0 ? (
        <div className="card py-12 text-center text-muted">{t("sites.empty")}</div>
      ) : (
        <ul className="grid gap-4 2xl:grid-cols-2">
          {sites.map((q) => (
            <SiteCard key={q.id} q={q} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SiteCard({ q }: { q: Quote }) {
  const { t } = useI18n();
  const [value, setValue] = useState(q.progress ?? 0);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const changed = value !== (q.progress ?? 0) || note.trim() !== "";

  const update = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await request("POST", `/api/quotes/${q.id}/actions`, { type: "progress", progress: value, ...(note.trim() ? { message: note.trim() } : {}) });
      await Promise.all([mutate("/api/quotes"), mutate(`/api/quotes/${q.id}/events`)]);
      setNote("");
      setMsg({ ok: true, text: t("sites.updated") });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? t("common.error") : t("common.error") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="card space-y-4" aria-labelledby={`s-${q.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id={`s-${q.id}`} className="font-semibold">
            <Link href={`/devis/${q.id}`} className="text-primary hover:underline">
              {q.number}
            </Link>{" "}
            — {q.client.name || t("quotes.noClient")}
          </h2>
          <p className="text-sm text-muted">{[q.project, q.client.address].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="text-right">
          <StatusBadge status={q.status} label={t(`status.${q.status}`)} />
          <p className="mt-1 text-sm font-semibold">
            {fmt(totals(q).ttc)} {t("common.currency")}
          </p>
        </div>
      </div>

      <Progress value={q.progress ?? 0} label={`${q.number} — ${t("sites.progress")}`} />

      <form onSubmit={update} className="space-y-3 rounded-xl bg-surface-2 p-4">
        <label className="flex items-center gap-3 text-sm font-medium">
          <span className="shrink-0">{t("sites.progress")}</span>
          <input type="range" min={0} max={100} step={5} value={value} onChange={(e) => setValue(Number(e.target.value))} className="h-2 w-full accent-[var(--primary)]" />
          <output className="w-12 shrink-0 text-right tabular-nums">{value} %</output>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {[0, 25, 50, 75, 100].map((p) => (
            <button key={p} type="button" aria-pressed={value === p} onClick={() => setValue(p)} className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${value === p ? "border-primary bg-primary text-on-primary" : "border-line bg-surface hover:bg-surface-2"}`}>
              {p} %
            </button>
          ))}
        </div>
        <label className="block text-sm font-medium">
          {t("sites.note")}
          <input className="input mt-1 font-normal" maxLength={1000} placeholder={t("sites.notePlaceholder")} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary" disabled={busy || !changed}>
            <Check size={16} aria-hidden />
            {value >= 100 ? t("sites.finish") : t("sites.update")}
          </button>
          <p role="status" className={`text-sm font-medium ${msg?.ok ? "text-ok" : "text-danger"}`}>
            {msg?.text}
          </p>
        </div>
        {q.clientId && <p className="text-xs text-muted">{t("sites.clientSees")}</p>}
      </form>

      {q.clientId && (
        <details>
          <summary className="cursor-pointer text-sm font-medium text-primary">{t("tl.title")}</summary>
          <div className="mt-3">
            <Timeline quoteId={q.id} />
          </div>
        </details>
      )}
    </li>
  );
}
