"use client";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectOption = { value: string; label: string };

// Liste déroulante à l'image de l'application (remplace le <select> natif). Clavier complet : flèches, Début/Fin, Entrée, Échap, saisie de la première lettre.
// La liste est dans un portail : aucun conteneur à débordement masqué (tableau, carte) ne peut la rogner.
export default function Select({
  value, onChange, options, id, className = "", disabled, required, "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly SelectOption[];
  id?: string;
  className?: string; // classes du bouton (ex. !min-h-9 !w-auto)
  disabled?: boolean;
  required?: boolean;
  "aria-label"?: string;
}) {
  const uid = useId();
  const listId = `${uid}-list`;
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; max: number } | null>(null);
  const current = options.findIndex((o) => o.value === value);

  const show = () => {
    if (disabled) return;
    setActive(Math.max(0, current));
    setOpen(true);
  };
  const close = (focus = true) => {
    setOpen(false);
    if (focus) btn.current?.focus();
  };
  const pick = (i: number) => {
    const o = options[i];
    if (o) onChange(o.value);
    close();
  };

  // Place la liste sous le bouton, ou au-dessus s'il manque de la place en bas.
  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 200 && above > below;
    setPos({ left: r.left, width: r.width, max: Math.min(320, up ? above : below), ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }) });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (!btn.current?.contains(e.target as Node) && !list.current?.contains(e.target as Node)) setOpen(false);
    };
    const leave = (e: Event) => {
      if (!list.current?.contains(e.target as Node)) setOpen(false);
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
    if (open) list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active, pos]);

  const onKey = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const last = options.length - 1;
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
      case "Home": e.preventDefault(); setActive(0); break;
      case "End": e.preventDefault(); setActive(last); break;
      case "Enter": case " ": e.preventDefault(); pick(active); break;
      case "Escape": e.preventDefault(); close(); break;
      case "Tab": close(false); break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          const now = Date.now();
          typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
          const i = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
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
          className={`input flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed ${open ? "!border-primary ring-2 ring-primary/30" : ""} ${className}`}
        >
          <span className="min-w-0 flex-1 truncate">{options[current]?.label ?? ""}</span>
          <ChevronDown size={16} aria-hidden className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {required && <input tabIndex={-1} aria-hidden required value={value} onChange={() => {}} className="pointer-events-none absolute inset-0 opacity-0" />}
      </span>
      {open && pos && typeof document !== "undefined" &&
        createPortal(
          <ul
            ref={list}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            style={{ position: "fixed", left: pos.left, minWidth: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.max }}
            className="z-[100] overflow-auto rounded-xl border border-line bg-surface p-1 text-sm text-ink shadow-xl"
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                id={`${uid}-o${i}`}
                role="option"
                aria-selected={i === current}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(i)}
                className={`flex min-h-9 cursor-pointer items-center justify-between gap-3 whitespace-nowrap rounded-lg px-2.5 py-1.5 ${i === active ? "bg-primary/10" : ""} ${i === current ? "font-semibold text-primary" : ""}`}
              >
                {o.label}
                {i === current && <Check size={15} aria-hidden />}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}
