"use client";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";

// Trois étapes ; chaque schéma est un profilé qui se dessine à l'entrée à l'écran (traits SVG, voir .draw dans globals.css).
const DRAWINGS = [
  <>{/* cadre seul */}<rect className="draw" pathLength={1} x="8" y="8" width="64" height="64" rx="2" /><rect className="draw" pathLength={1} style={{ "--i": 1 } as React.CSSProperties} x="15" y="15" width="50" height="50" /></>,
  <>{/* cadre + montant + vitrage */}<rect className="draw" pathLength={1} x="8" y="8" width="64" height="64" rx="2" /><path className="draw" pathLength={1} style={{ "--i": 1 } as React.CSSProperties} d="M40 8v64M8 40h64" /><path className="draw" pathLength={1} style={{ "--i": 2 } as React.CSSProperties} d="M20 28l8-8M20 52l12-12" /></>,
  <>{/* cadre validé */}<rect className="draw" pathLength={1} x="8" y="8" width="64" height="64" rx="2" /><path className="draw" pathLength={1} style={{ "--i": 1 } as React.CSSProperties} d="M24 42l11 11 22-24" strokeWidth="3.5" /></>,
];

export default function AssemblySteps() {
  const { locale } = useI18n();
  const c = marketing[locale];
  return (
    <section className="public-container py-20 sm:py-24">
      <h2 className="max-w-2xl text-3xl font-medium sm:text-4xl">{c.stepsTitle}</h2>
      <ol className="mt-12 grid gap-10 md:grid-cols-3">
        {[[c.step1, c.step1d], [c.step2, c.step2d], [c.step3, c.step3d]].map(([title, desc], i) => (
          <li key={title} className="border-t border-line pt-6">
            <svg viewBox="0 0 80 80" width="84" height="84" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-primary">{DRAWINGS[i]}</svg>
            <span className="mt-5 block font-mono text-sm text-accent">0{i + 1}</span>
            <h3 className="mt-2 text-xl font-semibold">{title}</h3>
            <p className="mt-3 text-sm leading-7 text-muted">{desc}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
