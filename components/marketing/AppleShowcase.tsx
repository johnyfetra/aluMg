"use client";
import { ArrowRight, Box, Calculator, Ruler, Store } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";
import Photo from "./Photo";
import Reveal from "./Reveal";

// Présentation produit sobre et plein cadre : grand titre, image qui s'agrandit, texte qui s'allume mot à mot au défilement, tuiles des atouts.
export default function AppleShowcase() {
  const { locale } = useI18n();
  const c = marketing[locale];
  const tiles = [
    [Store, c.bento1t, c.bento1d, "lg:col-span-2"],
    [Ruler, c.bento2t, c.bento2d, ""],
    [Box, c.bento3t, c.bento3d, ""],
    [Calculator, c.bento4t, c.bento4d, "lg:col-span-2"],
  ] as const;
  return (
    <section className="apple bg-(--side-bg) text-(--side-fg)" aria-labelledby="apple-title">
      <div className="public-container py-20 text-center sm:py-32">
        <Reveal>
          <p className="text-sm font-semibold text-(--side-accent)">{c.appleEyebrow}</p>
          <h2 id="apple-title" className="apple-title mx-auto mt-4 max-w-4xl text-[clamp(2.6rem,7vw,5.5rem)] font-semibold leading-[1.02] tracking-[-0.035em]">{c.appleTitle}</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-(--side-muted) sm:text-xl">{c.appleSub}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-[17px]">
            <a href="#demo" className="inline-flex items-center gap-1.5 rounded-full bg-(--side-accent) px-6 py-3 font-semibold text-(--side-bg) transition-transform hover:scale-[1.03]">{c.demoHero}</a>
            <Link href="/application" className="inline-flex items-center gap-1 py-3 font-semibold text-(--side-accent) hover:underline">{c.discover}<ArrowRight size={17} aria-hidden /></Link>
          </div>
        </Reveal>
        <Reveal variant="scale" className="mt-12 sm:mt-16">
          <div className="apple-media overflow-hidden rounded-[1.5rem] shadow-2xl sm:rounded-[2rem]"><Photo src="/brand/architecture-aluminium.webp" alt={c.appleAlt} className="aspect-[16/9]" /></div>
        </Reveal>
      </div>

      <div className="public-container pb-20 sm:pb-32">
        <p className="apple-read mx-auto max-w-4xl text-[clamp(1.6rem,3.6vw,2.9rem)] font-semibold leading-[1.18] tracking-[-0.02em]">
          {c.appleRead.split(" ").map((w, i) => <span key={i}>{w} </span>)}
        </p>
      </div>

      <div className="public-container pb-20 sm:pb-32">
        <Reveal stagger className="grid gap-4 lg:grid-cols-3">
          {tiles.map(([Icon, title, text, span]) => (
            <article key={title} className={`apple-tile group rounded-[1.75rem] bg-white/[0.06] p-7 text-left ring-1 ring-white/10 sm:p-10 ${span}`}>
              <span className="apple-tile-icon inline-grid size-14 place-items-center rounded-2xl bg-(--side-accent)/15"><Icon size={28} aria-hidden className="text-(--side-accent)" /></span>
              <h3 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h3>
              <p className="mt-3 max-w-md leading-7 text-(--side-muted)">{text}</p>
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
