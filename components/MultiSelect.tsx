"use client";
import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { SelectOption } from "./Select";
import { useI18n } from "@/lib/i18n";

// Liste déroulante à choix multiple (mêmes options riches que Select : logo, description, information à droite). Reste ouverte pendant les choix.
// `max` limite le nombre de choix ; au-delà, les options non choisies sont grisées.
export default function MultiSelect({ value, onChange, options, id, placeholder, max, searchable, "aria-label": ariaLabel }: {
  value: string[]; onChange: (v: string[]) => void; options: readonly SelectOption[]; id?: string; placeholder: string; max?: number; searchable?: boolean; "aria-label"?: string;
}) {
  const { t } = useI18n();
  const uid = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; max: number } | null>(null);
  const withSearch = searchable ?? options.length >= 9;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => `${o.label} ${o.description ?? ""}`.toLowerCase().includes(q)) : options;
  }, [options, query]);
  const chosen = options.filter((o) => value.includes(o.value));
  const full = max !== undefined && value.length >= max;

  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : full ? value : [...value, v]);
  const close = (focus = true) => { setOpen(false); if (focus) btn.current?.focus(); };

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 240 && above > below;
    const width = Math.max(r.width, 300);
    setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)), width, max: Math.min(380, up ? above : below), ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }) });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => { if (!btn.current?.contains(e.target as Node) && !list.current?.parentElement?.contains(e.target as Node)) setOpen(false); };
    const leave = (e: Event) => { if (!list.current?.parentElement?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away);
    window.addEventListener("resize", leave);
    window.addEventListener("scroll", leave, true);
    return () => { document.removeEventListener("pointerdown", away); window.removeEventListener("resize", leave); window.removeEventListener("scroll", leave, true); };
  }, [open]);
  useEffect(() => { if (open && pos && withSearch) search.current?.focus({ preventScroll: true }); }, [open, pos, withSearch]);

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) { if (["ArrowDown", "Enter", " "].includes(e.key)) { e.preventDefault(); setQuery(""); setActive(0); setOpen(true); } return; }
    const last = shown.length - 1;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(last, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter" || (e.key === " " && !withSearch)) { e.preventDefault(); if (shown[active]) toggle(shown[active].value); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") close(false);
  };

  return (
    <>
      <button
        ref={btn} id={id} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${uid}-list` : undefined} aria-label={ariaLabel}
        onClick={() => (open ? close() : (setQuery(""), setActive(0), setOpen(true)))} onKeyDown={onKey}
        className={`input flex items-center justify-between gap-2.5 text-left ${open ? "!border-primary ring-[3px] ring-primary/15" : ""}`}
      >
        {chosen.length > 0 && <span className="flex shrink-0 -space-x-2">{chosen.slice(0, 3).map((o) => <span key={o.value} className="rounded-full ring-2 ring-surface">{o.leading}</span>)}</span>}
        <span className={`min-w-0 flex-1 truncate ${chosen.length ? "" : "text-muted"}`}>{chosen.length ? chosen.map((o) => o.label).join(", ") : placeholder}</span>
        {chosen.length > 1 && <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">{chosen.length}</span>}
        <ChevronDown size={16} aria-hidden className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && pos && typeof document !== "undefined" &&
        createPortal(
          <div style={{ position: "fixed", left: pos.left, width: pos.width, maxWidth: "calc(100vw - 16px)", top: pos.top, bottom: pos.bottom, maxHeight: pos.max }} className="select-pop z-[100] flex flex-col overflow-hidden rounded-2xl border border-line bg-surface text-sm text-ink shadow-[0_18px_48px_rgba(0,0,0,0.35)]">
            {withSearch && (
              <div className="flex shrink-0 items-center gap-2 border-b border-line px-3">
                <Search size={15} aria-hidden className="text-muted" />
                <input ref={search} value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} onKeyDown={onKey} aria-label={t("select.search")} placeholder={t("select.search")} className="bare-focus min-h-11 w-full bg-transparent text-base outline-none placeholder:text-muted sm:text-sm" />
              </div>
            )}
            <ul ref={list} id={`${uid}-list`} role="listbox" aria-multiselectable aria-label={ariaLabel} className="min-h-0 flex-1 overflow-auto p-1.5">
              {shown.length === 0 && <li role="presentation" className="px-3 py-6 text-center text-muted">{t("select.none")}</li>}
              {shown.map((o, i) => {
                const on = value.includes(o.value);
                const blocked = full && !on;
                return (
                  <li key={o.value} role="presentation">
                    <div role="option" aria-selected={on} aria-disabled={blocked} onPointerEnter={() => setActive(i)} onClick={() => !blocked && toggle(o.value)} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 ${i === active ? "bg-surface-2" : ""} ${on ? "bg-primary/10" : ""} ${blocked ? "cursor-not-allowed opacity-45" : ""}`}>
                      <span aria-hidden className={`grid size-5 shrink-0 place-items-center rounded-md border ${on ? "border-primary bg-primary text-on-primary" : "border-line bg-surface"}`}>{on && <Check size={13} strokeWidth={3} />}</span>
                      {o.leading && <span className="shrink-0">{o.leading}</span>}
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate ${on ? "font-semibold text-primary" : "font-medium"}`}>{o.label}</span>
                        {o.description && <span className="block truncate text-xs text-muted">{o.description}</span>}
                      </span>
                      {o.meta && <span className="shrink-0 text-xs text-muted">{o.meta}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line px-3 py-2 text-xs text-muted">
              <span>{value.length}{max ? ` / ${max}` : ""} {t("multi.chosen")}</span>
              <button type="button" onClick={() => close()} className="rounded-lg px-2 py-1 font-semibold text-primary hover:bg-primary/10">{t("multi.done")}</button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
