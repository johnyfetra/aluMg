"use client";
import { Info } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n";

// Petit « i » d'aide à côté d'un libellé : explique un terme du métier (gamme, vantail, vitrage…) en langage simple.
// Discret (n'agrandit pas la ligne), ouvert au survol, au clavier ou au toucher ; une seule bulle à la fois.
export const HELP_TERMS = ["category", "opening", "leaves", "range", "finish", "glassType", "thickness", "pattern", "infill", "shutter", "control", "guard", "extras", "dims", "room", "leafCfg"] as const;
export type HelpTerm = (typeof HELP_TERMS)[number];

const CLOSE_OTHERS = "alumg:infotip";

export default function InfoTip({ term, className = "" }: { term: HelpTerm; className?: string }) {
  const { t } = useI18n();
  const id = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; arrow: number } | null>(null);
  const hover = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback(() => {
    window.dispatchEvent(new CustomEvent(CLOSE_OTHERS, { detail: id }));
    setOpen(true);
  }, [id]);

  useEffect(() => {
    const other = (e: Event) => (e as CustomEvent).detail !== id && setOpen(false);
    window.addEventListener(CLOSE_OTHERS, other);
    return () => window.removeEventListener(CLOSE_OTHERS, other);
  }, [id]);

  // Place la bulle sous le « i » (ou au-dessus s'il manque de la place), sans jamais sortir de l'écran ; la flèche pointe le « i ».
  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const w = Math.min(288, window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8));
    const up = window.innerHeight - r.bottom < 190 && r.top > 190;
    setPos({ left, arrow: r.left + r.width / 2 - left, ...(up ? { bottom: window.innerHeight - r.top + 8 } : { top: r.bottom + 8 }) });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => !btn.current?.contains(e.target as Node) && !(e.target as Element).closest?.(`[data-tip="${id}"]`) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const leave = () => setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", leave, true);
    window.addEventListener("resize", leave);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", leave, true);
      window.removeEventListener("resize", leave);
    };
  }, [open, id]);

  const title = t(`help.${term}.title`);
  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={`${t("help.label")} : ${title}`}
        aria-expanded={open}
        aria-describedby={open ? `${id}-tip` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onPointerEnter={(e) => { if (e.pointerType === "mouse") { clearTimeout(hover.current); hover.current = setTimeout(show, 160); } }}
        onPointerLeave={(e) => { if (e.pointerType === "mouse") { clearTimeout(hover.current); hover.current = setTimeout(() => setOpen(false), 120); } }}
        className={`-my-1 ml-1 inline-grid size-6 shrink-0 translate-y-px place-items-center rounded-full align-middle text-muted/70 transition-colors hover:text-primary focus-visible:text-primary ${open ? "text-primary" : ""} ${className}`}
      >
        <Info size={14} aria-hidden />
      </button>
      {open && pos && typeof document !== "undefined" &&
        createPortal(
          <div
            id={`${id}-tip`}
            role="tooltip"
            data-tip={id}
            onPointerEnter={() => clearTimeout(hover.current)}
            onPointerLeave={(e) => { if (e.pointerType === "mouse") hover.current = setTimeout(() => setOpen(false), 120); }}
            style={{ position: "fixed", left: pos.left, top: pos.top, bottom: pos.bottom, width: Math.min(288, window.innerWidth - 16) }}
            className="select-pop z-[110] rounded-xl border border-line bg-surface p-3.5 text-left shadow-[0_14px_40px_rgba(0,0,0,0.35)]"
          >
            <span aria-hidden className={`absolute size-3 rotate-45 border-line bg-surface ${pos.top !== undefined ? "-top-1.5 border-l border-t" : "-bottom-1.5 border-b border-r"}`} style={{ left: Math.max(14, pos.arrow - 6) }} />
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink"><Info size={14} aria-hidden className="text-primary" />{title}</p>
            <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-muted">{t(`help.${term}.text`)}</p>
          </div>,
          document.body,
        )}
    </>
  );
}
