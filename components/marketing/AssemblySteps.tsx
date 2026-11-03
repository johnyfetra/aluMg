"use client";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";
import Reveal from "./Reveal";

// Plan d'une baie au fil du défilement : les quatre profilés arrivent et se joignent en coupe d'onglet à 45°, les cotes se tracent, le vitrage se teinte
// (voir .plan dans globals.css ; sans cette fonction du navigateur, le plan est complet d'emblée).
const BARS = ["40,30 280,30 266,44 54,44", "280,30 280,250 266,236 266,44", "280,250 40,250 54,236 266,236", "40,250 40,30 54,44 54,236"];

function Plan({ caption }: { caption: string }) {
  return (
    <figure className="plan mx-auto w-full max-w-md">
      <svg viewBox="0 0 320 300" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" aria-hidden className="w-full text-ink">
        <rect className="glass" x="56" y="46" width="208" height="188" />
        {BARS.map((p, n) => <polygon key={n} className="bar" points={p} style={{ "--n": n } as React.CSSProperties} />)}
        <path className="draw" pathLength={1} d="M58 48h104v184H58zM158 48h104v184H158zM150 130v20M170 130v20" />
        <path className="draw" pathLength={1} style={{ "--i": 1 } as React.CSSProperties} d="M40 268h240M40 262v12M280 262v12M36 272l8-8M276 272l8-8M18 30v220M12 30h12M12 250h12M14 34l8-8M14 254l8-8" />
        <g className="cote" fill="currentColor" stroke="none" fontSize="11" fontFamily="var(--font-geist-mono, monospace)" textAnchor="middle"><text x="160" y="288">2 400</text><text x="0" y="0" transform="translate(9 140) rotate(-90)">2 150</text></g>
      </svg>
      <figcaption className="mt-3 text-center text-xs text-muted">{caption}</figcaption>
    </figure>
  );
}

export default function AssemblySteps() {
  const { locale } = useI18n();
  const c = marketing[locale];
  return (
    <section className="public-container grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-[1fr_1fr] lg:gap-20" aria-labelledby="how-title">
      <div>
        <Reveal><p className="eyebrow">{c.howEyebrow}</p><h2 id="how-title" className="mt-4 max-w-xl text-3xl font-medium sm:text-4xl">{c.stepsTitle}</h2></Reveal>
        {/* le mètre ruban se déroule le long des étapes à mesure qu'on les lit */}
        <div className="relative mt-12 pl-12">
          <span aria-hidden className="ruler-ticks tape absolute bottom-0 left-0 top-0 w-4 rounded-sm" />
          <Reveal as="ol" stagger className="space-y-10">
            {[[c.step1, c.step1d], [c.step2, c.step2d], [c.step3, c.step3d]].map(([title, desc], i) => (
              <li key={title}>
                <span className="block font-mono text-sm text-accent">0{i + 1}</span>
                <h3 className="mt-2 text-xl font-semibold">{title}</h3>
                <p className="mt-2 max-w-md text-sm leading-7 text-muted">{desc}</p>
              </li>
            ))}
          </Reveal>
        </div>
      </div>
      <Plan caption={c.planCaption} />
    </section>
  );
}
