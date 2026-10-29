"use client";
import { CircleAlert, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

export function LoadingState() {
  const { t } = useI18n();
  return <div role="status" aria-busy="true" className="space-y-4">
    <span className="sr-only">{t("common.loading")}</span>
    <div aria-hidden className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="card space-y-4"><div className="skeleton h-3 w-2/3" /><div className="skeleton h-8 w-1/2" /></div>)}</div>
    <div aria-hidden className="card space-y-5">{[0, 1, 2].map(i => <div key={i} className="skeleton h-10" />)}</div>
  </div>;
}

export function ErrorState({ retry }: { retry: () => void }) {
  const { t } = useI18n();
  return <div role="alert" className="card flex flex-wrap items-center gap-3 border-danger/30">
    <CircleAlert size={20} className="text-danger" aria-hidden />
    <p className="flex-1 text-sm">{t("common.error")}</p>
    <button type="button" className="btn-secondary" onClick={retry}>{t("ui.retry")}</button>
  </div>;
}

export function EmptyState({ message, children }: { message: string; children?: ReactNode }) {
  return <div className="card flex flex-col items-center gap-4 py-12 text-center">
    <span className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted"><Inbox size={23} aria-hidden /></span>
    <p className="max-w-md text-sm leading-relaxed text-muted">{message}</p>
    {children}
  </div>;
}
