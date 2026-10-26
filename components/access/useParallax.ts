"use client";
import { type RefObject, useEffect } from "react";

// Parallaxe 3D douce : l'élément s'incline vers le pointeur (variables CSS --px, --py entre -1 et 1), avec amortissement
// par requestAnimationFrame pour rester fluide. Désactivée sans survol (tactile) ou si l'utilisateur réduit les animations.
export function useParallax(stage: RefObject<HTMLElement | null>, host: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = stage.current;
    const area = host.current;
    if (!el || !area || matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(hover: hover)").matches) return;
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    const tick = () => {
      x += (tx - x) * 0.09;
      y += (ty - y) * 0.09;
      el.style.setProperty("--px", x.toFixed(3));
      el.style.setProperty("--py", y.toFixed(3));
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const move = (e: PointerEvent) => {
      const r = area.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      kick();
    };
    const leave = () => {
      tx = ty = 0;
      kick();
    };
    area.addEventListener("pointermove", move, { passive: true });
    area.addEventListener("pointerleave", leave);
    return () => {
      area.removeEventListener("pointermove", move);
      area.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf);
    };
  }, [stage, host]);
}
