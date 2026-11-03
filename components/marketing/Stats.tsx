"use client";
import { useEffect, useRef, useState } from "react";
import { useDirectorySummary } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";

// Compteur : monte jusqu'à la valeur une seule fois, quand il entre à l'écran (sans animation si l'on préfère moins de mouvement).
function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || !to) return;
    let raf = 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      raf = requestAnimationFrame(() => setN(to));
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / 1200);
        setN(Math.round(to * (1 - (1 - k) ** 3)));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);
  return <span ref={ref}>{n}</span>;
}

// Chiffres réels de la plateforme, tirés de l'annuaire public : rien d'inventé. Posés sous le titre du hero ; la ligne garde sa hauteur pendant le chargement.
export default function Stats() {
  const { locale } = useI18n();
  const c = marketing[locale];
  const { data } = useDirectorySummary();
  const stats = data?.total ? [[data.total, c.statPros], [data.works, c.statWorks], [data.completed, c.statDone]] as const : [];
  return (
    <ul className="grid min-h-[4.75rem] grid-cols-3 gap-4 sm:flex sm:min-h-10 sm:flex-wrap sm:gap-x-8 sm:gap-y-2">
      {stats.map(([n, label]) => (
        <li key={label} className="sm:flex sm:items-baseline sm:gap-2">
          <span className="block font-[family-name:var(--font-display)] text-3xl tabular-nums sm:text-4xl"><CountUp to={n} /></span>
          <span className="block text-xs leading-5 text-white/75 sm:text-sm">{label}</span>
        </li>
      ))}
    </ul>
  );
}
