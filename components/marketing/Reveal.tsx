"use client";
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";

// Apparition au défilement : un seul observateur pour toute la page ; seuls les blocs encore sous l'écran à l'hydratation sont masqués,
// si bien que sans JS, sans IntersectionObserver ou avec moins d'animations, tout reste visible (styles [data-reveal] dans globals.css).
let io: IntersectionObserver | null = null;
const observer = () => io ??= new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const el = e.target as HTMLElement;
    io?.unobserve(el);
    el.dataset.state = "in";
    // will-change n'est gardé que le temps de l'animation, cascade comprise
    setTimeout(() => { delete el.dataset.state; }, 1600);
  }
}, { rootMargin: "0px 0px -6% 0px" });

type Variant = "up" | "fade" | "left" | "right" | "scale" | "clip";
export default function Reveal({ as: Tag = "div", variant = "up", stagger = false, className, style, children, ...rest }: { as?: "div" | "section" | "ul" | "ol" | "figure" | "header"; variant?: Variant; stagger?: boolean; className?: string; style?: CSSProperties; children: ReactNode; id?: string; "aria-labelledby"?: string }) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches || el.getBoundingClientRect().top < innerHeight) return;
    el.dataset.state = "wait";
    observer().observe(el);
    return () => io?.unobserve(el);
  }, []);
  return <Tag ref={ref as never} data-reveal={stagger ? `${variant} stagger` : variant} className={className} style={style} {...rest}>{children}</Tag>;
}
