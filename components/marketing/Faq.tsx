"use client";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";
import Reveal from "./Reveal";

// Questions des ateliers : questions en serif italique, ouverture native sans JS ; la dernière ligne renvoie vers la bulle de discussion de la vitrine.
export default function Faq() {
  const { locale } = useI18n();
  const c = marketing[locale];
  const qs = [[c.q1, c.a1], [c.q2, c.a2], [c.q3, c.a3], [c.q4, c.a4], [c.q5, c.a5]] as const;
  return (
    <section className="faq cv border-t border-line" aria-labelledby="faq-title">
      <div className="public-container grid gap-12 py-20 sm:py-28 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
        <Reveal>
          <p className="eyebrow">{c.faqPro}</p>
          <h2 id="faq-title" className="mt-4 font-[family-name:var(--font-display)] text-4xl font-normal leading-tight sm:text-5xl">{c.faq}</h2>
          <p className="mt-4 leading-7 text-muted">{c.faqIntro} <span className="whitespace-nowrap text-ink">— {c.faqSign}</span></p>
          <p className="mt-8 border-t border-line pt-6 text-sm text-muted"><span className="font-[family-name:var(--font-display)] text-xl italic text-ink">{c.faqMore}</span> {c.faqMoreText}</p>
        </Reveal>
        <Reveal>
          {qs.map(([q, a], i) => (
            <details key={q} className="group border-b border-line first:border-t">
              <summary className="flex list-none items-baseline gap-4 py-5 [&::-webkit-details-marker]:hidden">
                <span className="w-6 shrink-0 font-mono text-xs text-muted group-open:text-accent">0{i + 1}</span>
                <span className="font-[family-name:var(--font-display)] text-[1.4rem] italic leading-snug group-hover:text-primary group-open:text-primary">{q}</span>
                <ChevronDown size={18} aria-hidden className="ml-auto shrink-0 self-center text-muted transition-transform duration-300 group-open:rotate-180" />
              </summary>
              <p className="max-w-xl pb-6 pl-10 text-[15px] leading-7 text-muted">{a}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
