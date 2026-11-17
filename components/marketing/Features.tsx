"use client";
import { ArrowRight, Box, Calculator, Languages, MessageCircle, Scissors, WifiOff } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";
import Reveal from "./Reveal";

// Les six fonctions livrées, sur fond vert atelier : rien d'annoncé qui ne soit dans l'application.
export default function Features() {
  const { locale } = useI18n();
  const c = marketing[locale];
  const tiles = [
    { Icon: Calculator, title: c.feat1t, text: c.feat1d },
    { Icon: Scissors, title: c.feat2t, text: c.feat2d },
    { Icon: Box, title: c.feat3t, text: c.feat3d },
    { Icon: MessageCircle, title: c.feat4t, text: c.feat4d },
    { Icon: WifiOff, title: c.feat5t, text: c.feat5d, href: "/telecharger", link: c.getApp },
    { Icon: Languages, title: c.feat6t, text: c.feat6d },
  ];
  return (
    <section id="fonctions" className="cv scroll-mt-28 bg-(--side-bg) text-(--side-fg)" aria-labelledby="feat-title">
      <div className="public-container py-20 sm:py-28">
        <Reveal className="max-w-2xl">
          <p className="eyebrow !text-(--side-accent)">{c.featEyebrow}</p>
          <h2 id="feat-title" className="mt-4 font-[family-name:var(--font-display)] text-4xl font-normal leading-tight sm:text-5xl">{c.featTitle}</h2>
          <p className="mt-5 leading-7 text-(--side-muted)">{c.featIntro}</p>
        </Reveal>
        <Reveal stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map(({ Icon, title, text, href, link }) => (
            <article key={title} className="feature-tile flex flex-col rounded-2xl bg-(--side-hover) p-6 ring-1 ring-(--side-active) sm:p-7">
              <span className="feature-tile-icon inline-grid size-12 place-items-center rounded-xl bg-(--side-accent)/15"><Icon size={24} aria-hidden className="text-(--side-accent)" /></span>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 leading-7 text-(--side-muted)">{text}</p>
              {href && <Link href={href} className="mt-4 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-(--side-accent) hover:underline">{link}<ArrowRight size={15} aria-hidden /></Link>}
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
