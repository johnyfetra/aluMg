"use client";
import { Check, ChevronDown, Search } from "lucide-react";
import { type ReactNode, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n";

// Une option peut porter un visuel (logo, pastille, icône), une description (ville · téléphone), une information à droite (note, prix) et un titre de groupe.
export type SelectOption = { value: string; label: string; leading?: ReactNode; description?: string; meta?: ReactNode; group?: string };

const SEARCH_FROM = 9; // au-delà, une zone de recherche aide à retrouver une option

// Liste déroulante à l'image de l'application (remplace le <select> natif). Clavier complet : flèches, Début/Fin, Entrée, Échap, saisie de la première lettre
// (ou recherche quand la liste est longue). La liste est dans un portail : aucun conteneur à débordement masqué (tableau, carte) ne peut la rogner.
export default function Select({
  value, onChange, options, id, className = "", disabled, required, searchable, "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly SelectOption[];
  id?: string;
  className?: string; // classes du bouton (ex. !min-h-9 !w-auto)
  disabled?: boolean;
  required?: boolean;
  searchable?: boolean;
  "aria-label"?: string;
}) {
  const { t } = useI18n();
  const uid = useId();
  const listId = `${uid}-list`;
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; max: number } | null>(null);
  const withSearch = searchable ?? options.length >= SEARCH_FROM;
  const rich = options.some((o) => o.leading || o.description);
  const current = options.find((o) => o.value === value);
  // options affichées (filtrées par la recherche) ; l'index actif porte sur cette liste
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => `${o.label} ${o.description ?? ""}`.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const show = () => {
    if (disabled) return;
    setQuery("");
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const close = (focus = true) => {
    setOpen(false);
    if (focus) btn.current?.focus();
  };
  const pick = (i: number) => {
    const o = shown[i];
    if (o) onChange(o.value);
    close();
  };

  // Place la liste sous le bouton, ou au-dessus s'il manque de la place en bas.
  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 220 && above > below;
    const width = Math.max(r.width, rich ? 288 : 0);
    setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)), width, max: Math.min(360, up ? above : below), ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }) });
  }, [open, rich]);

  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (!btn.current?.contains(e.target as Node) && !list.current?.parentElement?.contains(e.target as Node)) setOpen(false);
    };
    const leave = (e: Event) => {
      if (!list.current?.parentElement?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    window.addEventListener("resize", leave);
    window.addEventListener("scroll", leave, true);
    return () => {
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("resize", leave);
      window.removeEventListener("scroll", leave, true);
    };
  }, [open]);

  useEffect(() => {
    if (open && pos && withSearch) search.current?.focus({ preventScroll: true });
  }, [open, pos, withSearch]);
  useEffect(() => {
    if (open) list.current?.querySelector(`#${CSS.escape(`${uid}-o${active}`)}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, pos, uid]);

  const onKey = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const last = shown.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setActive((a) => Math.min(last, a + 1)); break;
      case "ArrowUp": e.preventDefault(); setActive((a) => Math.max(0, a - 1)); break;
      case "Home": if (!withSearch) { e.preventDefault(); setActive(0); } break;
      case "End": if (!withSearch) { e.preventDefault(); setActive(last); } break;
      case "Enter": e.preventDefault(); pick(active); break;
      case " ": if (!withSearch) { e.preventDefault(); pick(active); } break;
      case "Escape": e.preventDefault(); close(); break;
      case "Tab": close(false); break;
      default:
        if (!withSearch && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          const now = Date.now();
          typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
          const i = shown.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
          if (i >= 0) setActive(i);
        }
    }
  };

  return (
    <>
      <span className="relative block">
        <button
          ref={btn}
          id={id}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open ? `${uid}-o${active}` : undefined}
          aria-label={ariaLabel}
          disabled={disabled}
          onClick={() => (open ? close() : show())}
          onKeyDown={onKey}
          className={`input flex items-center justify-between gap-2.5 text-left disabled:cursor-not-allowed ${open ? "!border-primary ring-[3px] ring-primary/15" : ""} ${className}`}
        >
          {current?.leading && <span className="shrink-0">{current.leading}</span>}
          <span className="min-w-0 flex-1">
            <span className="block truncate">{current?.label ?? ""}</span>
            {current?.description && <span className="block truncate text-xs text-muted">{current.description}</span>}
          </span>
          {current?.meta && <span className="shrink-0 text-xs text-muted">{current.meta}</span>}
          <ChevronDown size={16} aria-hidden className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {required && <input tabIndex={-1} aria-hidden required value={value} onChange={() => {}} className="pointer-events-none absolute inset-0 opacity-0" />}
      </span>
      {open && pos && typeof document !== "undefined" &&
        createPortal(
          <div
            style={{ position: "fixed", left: pos.left, width: pos.width, maxWidth: "calc(100vw - 16px)", top: pos.top, bottom: pos.bottom, maxHeight: pos.max }}
            className="select-pop z-[100] flex flex-col overflow-hidden rounded-2xl border border-line bg-surface text-sm text-ink shadow-[0_18px_48px_rgba(0,0,0,0.35)]"
          >
            {withSearch && (
              <div className="flex shrink-0 items-center gap-2 border-b border-line px-3">
                <Search size={15} aria-hidden className="text-muted" />
                <input
                  ref={search}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                  onKeyDown={onKey}
                  aria-label={t("select.search")}
                  aria-controls={listId}
                  placeholder={t("select.search")}
                  className="bare-focus min-h-11 w-full bg-transparent text-base outline-none placeholder:text-muted sm:text-sm"
                />
              </div>
            )}
            <ul ref={list} id={listId} role="listbox" aria-label={ariaLabel} className="min-h-0 flex-1 overflow-auto p-1.5">
              {shown.length === 0 && <li role="presentation" className="px-3 py-6 text-center text-muted">{t("select.none")}</li>}
              {shown.map((o, i) => {
                const heading = o.group && o.group !== shown[i - 1]?.group ? o.group : null;
                const selected = o.value === value;
                return (
                  <li key={o.value} role="presentation">
                    {heading && <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{heading}</p>}
                    <div
                      id={`${uid}-o${i}`}
                      role="option"
                      aria-selected={selected}
                      onPointerEnter={() => setActive(i)}
                      onClick={() => pick(i)}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl px-2.5 ${rich ? "min-h-12 py-2" : "min-h-10 py-1.5"} ${i === active ? "bg-surface-2" : ""} ${selected ? "bg-primary/10" : ""}`}
                    >
                      {o.leading && <span className="shrink-0">{o.leading}</span>}
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate ${selected ? "font-semibold text-primary" : "font-medium"}`}>{o.label}</span>
                        {o.description && <span className="block truncate text-xs text-muted">{o.description}</span>}
                      </span>
                      {o.meta && <span className="shrink-0 text-xs text-muted">{o.meta}</span>}
                      {selected && <Check size={16} aria-hidden className="shrink-0 text-primary" />}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
