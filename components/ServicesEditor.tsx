"use client";
import { Plus, Trash2, Wrench } from "lucide-react";
import Select from "./Select";
import { fmt } from "@/lib/calc";
import type { T } from "@/lib/i18n";
import { SERVICE_KINDS, type Service, type ServiceKind } from "@/lib/model";
import { serviceTotal } from "@/lib/totals";

// Prestations hors ouvrage : pose, dépose, déplacement… Lignes libres, comptées dans le total avant remise.
export default function ServicesEditor({ services, onChange, t, locked }: { services: Service[]; onChange: (s: Service[]) => void; t: T; locked: boolean }) {
  const set = (i: number, patch: Partial<Service>) => onChange(services.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const add = (kind: ServiceKind) => onChange([...services, { id: crypto.randomUUID(), kind, label: t(`svc.${kind}`), qty: 1, price: 0 }]);
  const sum = services.reduce((a, s) => a + serviceTotal(s), 0);
  const n = (v: string) => Math.max(0, Number(v) || 0);

  return (
    <section className="card space-y-4" aria-labelledby="h-svc">
      <div>
        <h2 id="h-svc" className="flex items-center gap-2 text-lg font-semibold">
          <Wrench size={18} aria-hidden className="text-primary" />
          {t("svc.title")}
        </h2>
        <p className="text-sm text-muted">{t("svc.hint")}</p>
      </div>
      {services.length > 0 && (
        <ul className="space-y-3">
          {services.map((s, i) => (
            <li key={s.id} className="grid gap-2 rounded-lg border border-line bg-surface-2/40 p-3 sm:grid-cols-[9rem_minmax(0,1fr)_5rem_9rem_auto] sm:items-end">
              <label className="space-y-1 text-xs font-medium text-muted">
                <span className="sr-only sm:not-sr-only">Type</span>
                <Select value={s.kind} disabled={locked} className="!min-h-10" onChange={(v) => set(i, { kind: v as ServiceKind })} options={SERVICE_KINDS.map((k) => ({ value: k, label: t(`svc.${k}`) }))} />
              </label>
              <label className="space-y-1 text-xs font-medium text-muted">
                {t("svc.label")}
                <input className="input" maxLength={120} disabled={locked} value={s.label} onChange={(e) => set(i, { label: e.target.value })} />
              </label>
              <label className="space-y-1 text-xs font-medium text-muted">
                {t("svc.qty")}
                <input className="input" type="number" inputMode="decimal" min={0} disabled={locked} value={s.qty || ""} onChange={(e) => set(i, { qty: n(e.target.value) })} />
              </label>
              <label className="space-y-1 text-xs font-medium text-muted">
                {t("svc.price")}
                <input className="input" type="number" inputMode="numeric" min={0} disabled={locked} value={s.price || ""} onChange={(e) => set(i, { price: n(e.target.value) })} />
              </label>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span className="text-sm font-semibold tabular-nums sm:hidden">{fmt(serviceTotal(s))} {t("common.currency")}</span>
                {!locked && (
                  <button type="button" className="btn-danger !min-h-10 !px-3" onClick={() => onChange(services.filter((_, j) => j !== i))} aria-label={`${t("svc.remove")} ${i + 1}`} title={t("svc.remove")}>
                    <Trash2 size={16} aria-hidden />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!locked ? (
          <div role="group" aria-label={t("svc.add")} className="flex flex-wrap gap-2">
            {SERVICE_KINDS.map((k) => (
              <button key={k} type="button" className="btn-secondary !min-h-9 !px-3 text-xs" onClick={() => add(k)}>
                <Plus size={14} aria-hidden />
                {t(`svc.${k}`)}
              </button>
            ))}
          </div>
        ) : <span />}
        {services.length > 0 && (
          <p className="text-sm">
            <span className="text-muted">{t("svc.total")} : </span>
            <strong className="tabular-nums">{fmt(sum)} {t("common.currency")}</strong>
          </p>
        )}
      </div>
    </section>
  );
}
