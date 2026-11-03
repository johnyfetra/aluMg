"use client";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";

const AUTO_OPEN_MS = 5500; // personne n'y touche : le volet s'ouvre seul, la photo ne reste jamais cachée

// Volet roulant sur le hero : fermé à l'arrivée (tout le hero est derrière), il se manie à la poignée (glisser, cliquer, flèches du clavier).
// Le déplacement passe par une variable CSS (--p : 0 fermé, 1 ouvert) posée directement sur l'élément : aucun rendu React pendant le glissé.
// onClosed(true) : le volet est entièrement fermé (le texte du hero peut passer au-dessus) ; onClosed(false) : il bouge ou il est levé (le texte reste derrière).
export default function RollerShutter({ onOpen, onClosed }: { onOpen: () => void; onClosed: (closed: boolean) => void }) {
  const { locale } = useI18n();
  const c = marketing[locale];
  const panel = useRef<HTMLDivElement>(null);
  const p = useRef(0);
  const drag = useRef<{ y: number; p: number; moved: boolean } | null>(null);
  const touched = useRef(false);
  const [open, setOpen] = useState(false);

  const settle = (to: number) => {
    const el = panel.current;
    if (!el) return;
    p.current = to;
    el.removeAttribute("data-drag");
    el.style.setProperty("--p", String(to));
    setOpen(to === 1);
    onClosed(to === 0);
    if (to === 1) onOpen();
  };

  // fin de la descente d'arrivée : le volet est fermé. Si l'animation est déjà finie (hydratation tardive) ou absente (moins d'animations), c'est fermé d'emblée.
  useEffect(() => {
    const drop = panel.current?.getAnimations().find((a) => (a as CSSAnimation).animationName === "shutter-drop");
    if (!drop) { onClosed(true); return; }
    let live = true;
    drop.finished.then(() => { if (live && p.current === 0 && !drag.current) onClosed(true); }, () => {});
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois au montage
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (!touched.current) settle(1); }, AUTO_OPEN_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule minuterie au montage
  }, []);

  const down = (e: React.PointerEvent) => {
    touched.current = true;
    onClosed(false);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, p: p.current, moved: false };
    panel.current?.setAttribute("data-drag", "");
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !panel.current) return;
    const dy = e.clientY - d.y;
    if (Math.abs(dy) > 4) d.moved = true;
    p.current = Math.min(1, Math.max(0, d.p - dy / panel.current.offsetHeight));
    panel.current.style.setProperty("--p", String(p.current));
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    settle(d.moved ? (p.current > 0.25 ? 1 : 0) : d.p > 0.5 ? 0 : 1); // un simple clic bascule ; un glissé va au bout le plus proche
  };
  const key = (e: React.KeyboardEvent) => {
    touched.current = true;
    if (e.key === "ArrowUp" || e.key === "Home") settle(1);
    else if (e.key === "ArrowDown" || e.key === "End") settle(0);
    else if (e.key === "Enter" || e.key === " ") settle(open ? 0 : 1);
    else return;
    e.preventDefault();
  };

  return (
    <div ref={panel} aria-hidden={false} className="shutter" onClick={() => { if (!open && !drag.current) { touched.current = true; settle(1); } }}>
      <div
        role="slider"
        tabIndex={0}
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={open ? 100 : 0}
        aria-valuetext={open ? c.shutterClose : c.shutterOpen}
        aria-label={c.shutterOpen}
        className="shutter-rail"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
        onClick={(e) => e.stopPropagation()}
      >
        <span aria-hidden className="shutter-grip" />
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.16em]">
          {open ? <ChevronDown size={13} aria-hidden /> : <ChevronUp size={13} aria-hidden />}
          {open ? c.shutterClose : c.shutterHint}
        </span>
      </div>
    </div>
  );
}
