"use client";
import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import RoleBadge from "./RoleBadge";
import { Avatar } from "./ui";
import { openConversation, usePeople } from "@/lib/client";
import { useI18n } from "@/lib/i18n";

// Nouvelle discussion : on cherche parmi les personnes à qui l'on a le droit d'écrire (menuisiers publiés pour un client, clients ayant demandé un devis pour un menuisier).
export default function NewChatDialog({ role, onClose, onOpen }: { role: "client" | "menuisier" | "admin"; onClose: () => void; onOpen: (id: string) => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [err, setErr] = useState(false);
  const { data: people = [], isLoading } = usePeople(debounced, true);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-label={t("nc.title")} className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/50">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-semibold">{t("nc.title")}</h2>
        <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-surface-2" aria-label={t("ci.close")}><X size={18} aria-hidden /></button>
      </div>
      <div className="p-3">
        <label className="flex items-center gap-2 rounded-full bg-surface-2 px-3.5 py-2">
          <Search size={16} aria-hidden className="text-muted" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} maxLength={60} placeholder={t(role === "client" ? "nc.searchMenuisier" : role === "menuisier" ? "nc.searchClient" : "nc.searchAny")} aria-label={t("nc.title")} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
        {role === "menuisier" && <p className="mt-2 px-1 text-xs text-muted">{t("nc.hintMenuisier")}</p>}
      </div>
      <ul className="max-h-[50dvh] overflow-y-auto border-t border-line">
        {!isLoading && people.length === 0 && <li className="p-6 text-center text-sm text-muted">{t("nc.none")}</li>}
        {people.map((p, i) => (
          <li key={`${p.name}${i}`}>
            <button type="button" className="flex w-full items-center gap-3 border-b border-line px-4 py-2.5 text-left hover:bg-surface-2" onClick={async () => { setErr(false); try { onOpen(await openConversation(p.target)); } catch { setErr(true); } }}>
              <Avatar name={p.name} src={p.avatar} size={40} round={p.role === "client"} />
              <span className="flex min-w-0 items-center gap-1.5"><span className="truncate text-sm font-semibold">{p.name}</span><RoleBadge role={p.role} /></span>
            </button>
          </li>
        ))}
      </ul>
      {err && <p role="alert" className="p-3 text-sm font-medium text-danger">{t("common.error")}</p>}
    </dialog>
  );
}
