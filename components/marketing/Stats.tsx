"use client";
import { useEffect, useRef, useState } from "react";
import { useDirectory } from "@/lib/client";
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

// Chiffres réels de la plateforme, tirés de l'annuaire public : rien d'inventé.
export default function Stats() {
  const { locale } = useI18n();
  const c = marketing[locale];
  const { data } = useDirectory({});
  if (!data?.length) return null;
  const stats = [[data.length, c.statPros], [data.reduce((a, m) => a + m.portfolio, 0), c.statWorks], [data.reduce((a, m) => a + m.completed, 0), c.statDone]] as const;
  return (
    <ul className="public-container grid grid-cols-3 gap-4 py-8 text-center sm:py-10">
      {stats.map(([n, label]) => (
        <li key={label}>
          <p className="font-[family-name:var(--font-display)] text-4xl text-primary sm:text-6xl"><CountUp to={n} /></p>
          <p className="mt-1 text-xs text-muted sm:text-sm">{label}</p>
        </li>
      ))}
    </ul>
  );
}
