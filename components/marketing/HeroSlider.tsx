"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";
import RollerShutter from "./RollerShutter";
import Stats from "./Stats";
import { onImgError } from "@/lib/fallback";

// Hero plein cadre : une fenêtre coulissante à vitres transparentes s'ouvre sur la photo, une promesse fixe (rendue sans JS) et les deux parcours, client et menuisier.
// Seules les photos défilent (fondu enchaîné, suspendu au survol, sur un onglet masqué ou si l'on préfère moins d'animation).
const SLIDES = [
  { src: "/brand/architecture-aluminium.webp", pos: "62% center", mobile: "/brand/architecture-aluminium-mobile.webp" },
  { src: "/brand/precision-aluminium.webp", pos: "55% center" },
  { src: "/brand/realisation-aluminium.webp", pos: "center 30%" },
  { src: "/brand/atelier.webp", pos: "center 62%" },
];
const DELAY = 6500;

export default function HeroSlider() {
  const { locale } = useI18n();
  const c = marketing[locale];
  const alts = [c.heroAlt, ...c.slideAlts];
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [armed, setArmed] = useState(false);
  const [above, setAbove] = useState(false); // volet entièrement fermé : le texte passe au-dessus ; sinon il reste derrière
  const [opened, setOpened] = useState(false); // le volet a été levé au moins une fois : la fenêtre derrière peut s'ouvrir
  const start = useRef<number | null>(null);
  const go = (n: number) => setI((n + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setI((n) => (n + 1) % SLIDES.length), DELAY);
    return () => clearTimeout(t);
  }, [i, paused]);
  // les autres photos attendent que la première (l'image LCP) ait eu la bande passante pour elle
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 2500);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const hide = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);

  return (
    <div
      role="group"
      aria-roledescription="carrousel"
      aria-label={c.heroAlt}
      data-open={opened || undefined} className="door relative isolate flex min-h-[min(88svh,52rem)] flex-col justify-end overflow-hidden rounded-[1.75rem] bg-(--hero-from)"
      onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onPointerDown={(e) => { start.current = e.clientX; }}
      onPointerUp={(e) => { if (start.current !== null && Math.abs(e.clientX - start.current) > 50) go(i + (e.clientX < start.current ? 1 : -1)); start.current = null; }}
    >
      {SLIDES.map((s, n) => (armed || n === 0 || n === i) && (
        <picture key={s.src}>
          {s.mobile && <source media="(max-width: 640px)" srcSet={s.mobile} />}
          <img src={s.src} onError={onImgError} alt={alts[n]} aria-hidden={n !== i} width={1536} height={1024} fetchPriority={n === 0 ? "high" : "low"} decoding={n === 0 ? "sync" : "async"} draggable={false} className={`slide-img absolute inset-0 -z-10 h-full w-full select-none object-cover ${n === i ? "is-on" : ""}`} style={{ objectPosition: s.pos }} />
        </picture>
      ))}
      <span aria-hidden className="hero-scrim pointer-events-none absolute inset-0 -z-10" />
      <span aria-hidden className="win"><span className="win-frame" /><span className="win-inner"><span className="win-sash win-fixed" /><span className="win-sash win-slide" /></span></span>
      <RollerShutter onOpen={() => setOpened(true)} onClosed={setAbove} />
      <noscript><style>{".shutter{display:none}"}</style></noscript>
      <div data-above={above || undefined} className="hero-text pointer-events-none px-5 pb-14 pt-28 text-white sm:px-10 sm:pb-16 lg:px-14 lg:pb-20 [&_a]:pointer-events-auto [&_button]:pointer-events-auto"> {/* les textes passent au-dessus du volet sans lui voler les clics */}
        <p className="hero-in eyebrow flex items-center gap-3 !text-white/85"><span className="h-px w-8 shrink-0 bg-accent" />{c.eyebrow}</p>
        <h1 id="home-title" className="hero-in mt-5 max-w-[15ch] font-[family-name:var(--font-display)] text-[clamp(2.6rem,7.2vw,6rem)] font-normal leading-[0.98] tracking-[-0.015em]" style={{ "--i": 1 } as React.CSSProperties}>{c.title} <em className="block text-(--side-accent)">{c.titleEnd}</em></h1>
        <p className="hero-in mt-5 max-w-xl text-[15px] leading-7 text-white/85 sm:text-base" style={{ "--i": 2 } as React.CSSProperties}>{c.intro}</p>
        <div className="hero-in mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap" style={{ "--i": 3 } as React.CSSProperties}>
          <Link href="/menuisiers" className="btn-accent !min-h-12 !px-6 !text-[15px]">{c.find}<ArrowRight size={17} aria-hidden /></Link>
          <Link href="/inscription?role=menuisier" className="hero-glass btn-secondary !min-h-12 !px-6 !text-[15px]">{c.pro}</Link>
        </div>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-5 border-t border-white/20 pt-5">
          <div className="hero-in w-full sm:w-auto" style={{ "--i": 4 } as React.CSSProperties}><Stats /></div>
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-white/70">{c.editorial}</span>
            <div className="flex gap-2 rounded-full bg-black/30 px-3 py-2 backdrop-blur-md">
              {SLIDES.map((_, n) => (
                <button key={n} type="button" aria-current={n === i} aria-label={`${n + 1} / ${SLIDES.length}`} onClick={() => go(n)} className={`h-2 rounded-full transition-all duration-500 ${n === i ? "w-6 bg-white" : "w-2 bg-white/55 hover:bg-white/80"}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <a href="#suite" aria-label={c.scrollCue} className="absolute right-5 top-28 hidden w-8 flex-col items-center gap-3 text-[10px] font-semibold uppercase tracking-[.2em] text-white/80 lg:flex"><span aria-hidden className="ruler-ticks h-28 w-3" /><span className="[writing-mode:vertical-rl]">{c.scrollCue}</span></a>
    </div>
  );
}
