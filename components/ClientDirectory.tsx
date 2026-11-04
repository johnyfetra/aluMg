"use client";
import { Search, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Pager } from "@/components/admin/AdminUi";
import { EmptyState, ErrorState } from "@/components/Feedback";
import { Avatar } from "@/components/ui";
import { useClientDirectory } from "@/lib/client";
import { useI18n } from "@/lib/i18n";

// Annuaire des clients de la plateforme : un menuisier cherche un client par son nom et l'ajoute au devis. Coordonnées masquées : on ne voit que de quoi reconnaître la personne.
export default function ClientDirectory({ onPick, onClose }: { onPick: (c: { id: string; name: string }) => void; onClose: () => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  useEffect(() => {
    const id = setTimeout(() => (setTerm(q.trim()), setPage(1)), 300);
    return () => clearTimeout(id);
  }, [q]);
  const { data, error, isLoading, mutate } = useClientDirectory(term, page);
  return (
    <dialog ref={ref} aria-labelledby="cd-title" onClose={() => !ref.current?.open && onClose()} onClick={(e) => e.target === ref.current && onClose()} className="m-auto max-h-[90vh] w-[min(96vw,38rem)] overflow-hidden rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/60">
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 id="cd-title" className="flex items-center gap-2 text-lg font-semibold"><Users size={18} aria-hidden className="text-primary" />{t("ct.platform")}</h2>
          <p className="text-sm text-muted">{t("ct.platformSub")}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t("viewer.close")} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-surface-2"><X size={20} aria-hidden /></button>
      </div>
      <div className="max-h-[calc(90vh-6rem)] space-y-4 overflow-y-auto p-5">
        <label className="relative block">
          <span className="sr-only">{t("ct.searchPh")}</span>
          <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input !pl-9" type="search" maxLength={60} autoFocus placeholder={t("ct.searchPh")} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {error ? <ErrorState retry={() => mutate()} /> : isLoading || !data ? <p role="status" className="text-sm text-muted">{t("common.loading")}</p> : data.items.length === 0 ? <EmptyState message={t("ct.none")} /> : (
          <>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {data.items.map((c) => (
                <li key={c.id} className="flex items-center gap-3 p-3">
                  <Avatar name={c.name} src={c.avatar} size={40} round />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.name}</p>
                    {c.hint && <p className="truncate text-sm text-muted">{c.hint}</p>}
                  </div>
                  <button type="button" className="btn-primary !min-h-9 !px-3 text-sm" onClick={() => onPick({ id: c.id, name: c.name })}>{t("ct.addToQuote")}</button>
                </li>
              ))}
            </ul>
            <Pager page={data.page} pageSize={data.pageSize} total={data.total} noun={t("ct.noun")} onPage={setPage} />
          </>
        )}
      </div>
    </dialog>
  );
}
