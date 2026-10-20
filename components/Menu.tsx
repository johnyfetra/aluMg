"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Menu déroulant accessible : bouton + liste role="menu", flèches haut/bas, Échap ferme et rend le focus.
export default function Menu({
  label,
  trigger,
  children,
  align = "right",
  triggerClass = "btn-secondary",
  width = "w-56",
}: {
  label: string;
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  triggerClass?: string;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", away);
    root.current?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus();
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      btn.current?.focus();
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const items = [...(root.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])];
      const i = items.indexOf(document.activeElement as HTMLElement);
      items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    }
  };

  return (
    <div ref={root} className="relative" onKeyDown={onKey}>
      <button ref={btn} type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} className={triggerClass} onClick={() => setOpen((o) => !o)}>
        {trigger}
      </button>
      {open && (
        <div role="menu" aria-label={label} className={`absolute z-40 mt-2 ${width} origin-top overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-xl ring-1 ring-black/5 ${align === "right" ? "right-0" : "left-0"}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export const menuItem = "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-ink transition-colors hover:bg-surface-2 focus-visible:bg-surface-2";
