"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { heroSlides, marketing } from "@/lib/marketing";

// Diaporama du hero : fondu enchaîné, défilement automatique (suspendu au survol, sur un onglet masqué ou si l'on préfère moins d'animation),
// points cliquables et balayage au doigt.
const SLIDES = [
  { src: "/brand/architecture-aluminium.webp", pos: "62% center" },
  { src: "/brand/precision-aluminium.webp", pos: "55% center" },
  { src: "/brand/realisation-aluminium.webp", pos: "center 30%" },
  { src: "/brand/atelier.webp", pos: "center 62%" },
] as const;
const DELAY = 6500;

export default function HeroSlider() {
  const { locale } = useI18n();
  const c = marketing[locale];
  const texts = heroSlides[locale];
  const alts = [c.heroAlt, ...c.slideAlts];
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const start = useRef<number | null>(null);
  const go = (n: number) => setI((n + SLIDES.length) % SLIDES.length);
  const txt = texts[i];

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setI((n) => (n + 1) % SLIDES.length), DELAY);
    return () => clearTimeout(t);
  }, [i, paused]);
  useEffect(() => {
    const hide = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);

  return (
    <figure className="relative">
      <div
        role="group"
        aria-roledescription="carrousel"
        aria-label={c.heroAlt}
        className="door relative h-[min(80vh,48rem)] min-h-[22rem] overflow-hidden rounded-[1.75rem] bg-surface-2 sm:min-h-[30rem] lg:min-h-[36rem]"
        onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onPointerDown={(e) => { start.current = e.clientX; }}
        onPointerUp={(e) => { if (start.current !== null && Math.abs(e.clientX - start.current) > 50) go(i + (e.clientX < start.current ? 1 : -1)); start.current = null; }}
      >
        {SLIDES.map((s, n) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={s.src} src={s.src} alt={alts[n]} aria-hidden={n !== i} loading={n === 0 ? "eager" : "lazy"} fetchPriority={n === 0 ? "high" : undefined} decoding="async" draggable={false} className={`slide-img absolute inset-0 h-full w-full select-none object-cover ${n === i ? "is-on" : ""}`} style={{ objectPosition: s.pos }} />
        ))}
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent max-lg:hidden" />
        <div className="absolute bottom-5 right-5 z-[3] flex gap-2 rounded-full bg-black/30 px-3 py-2 backdrop-blur-md" aria-label={c.heroAlt}>
          {SLIDES.map((_, n) => (
            <button key={n} type="button" aria-current={n === i} aria-label={`${n + 1} / ${SLIDES.length}`} onClick={() => go(n)} className={`h-2 rounded-full transition-all duration-500 ${n === i ? "w-6 bg-white" : "w-2 bg-white/55 hover:bg-white/80"}`} />
          ))}
        </div>
      </div>
      <div className="float-in relative z-10 mx-3 -mt-20 rounded-2xl border border-line bg-surface/85 p-6 shadow-[0_30px_70px_-30px_rgb(0_0_0/0.6)] backdrop-blur-xl sm:mx-6 sm:p-8 lg:absolute lg:-bottom-10 lg:left-10 lg:mx-0 lg:mt-0 lg:max-w-[28rem] lg:p-7" style={{ animationDelay: "1s" }}>
        <div key={i} className="show-in">
          <p className="eyebrow flex items-center gap-3"><span className="h-px w-8 shrink-0 bg-accent" />{txt.who}</p>
          <h1 id="home-title" className="mt-4 font-[family-name:var(--font-display)] text-[clamp(2.1rem,3.4vw,3.2rem)] font-normal leading-[1.02] tracking-[-0.01em]">{txt.title}<em className="block text-primary">{txt.end}</em></h1>
          <p className="mt-3 text-sm leading-6 text-muted">{txt.intro}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3"><Link href={txt.cta[1]} className="btn-primary !min-h-11 !px-5">{txt.cta[0]}<ArrowRight size={17} aria-hidden /></Link><Link href={txt.alt[1]} className="btn-secondary !min-h-11 !px-5">{txt.alt[0]}</Link></div>
        </div>
      </div>
    </figure>
  );
}
