"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";
import Hero from "./Hero";
import AssemblySteps from "./AssemblySteps";
import Features from "./Features";
import WhatsAppFlow from "./WhatsAppFlow";
import Reveal from "./Reveal";
import DemoBooking from "./DemoBooking";
import Faq from "./Faq";

// La pile de captures 3D est lourde et sous le pli : chargée à part, sa place est réservée (même rapport) pour ne rien décaler.
const ProductShowcase = dynamic(() => import("./ProductShowcase"), { loading: () => <div className="aspect-[3/2] md:aspect-[2/1]" /> });

export function FinalCta() {
  const { locale } = useI18n(); const c = marketing[locale];
  return <section className="border-t border-line bg-surface"><div className="public-container py-16 text-center sm:py-24"><p className="eyebrow">{c.question}</p><h2 className="mx-auto mt-4 max-w-3xl text-3xl font-medium tracking-tight sm:text-5xl">{c.finalTitle}</h2><p className="mt-5 text-muted">{c.finalSub}</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/inscription?role=menuisier" className="btn-accent !min-h-12 !px-6">{c.start}<ArrowRight size={17} aria-hidden /></Link><Link href="/#demo" className="btn-secondary !min-h-12 !px-6">{c.demoCta}</Link></div></div></section>;
}

// Vitrine centrée sur le menuisier : la promesse, les trois étapes, les fonctions livrées, le trajet WhatsApp, l'application réelle, puis démo et questions.
export default function MarketingHome() {
  const { locale } = useI18n(); const c = marketing[locale];
  return <div className="home">
    <Hero />
    <div className="border-y border-line bg-surface"><AssemblySteps /></div>
    <Features />
    <WhatsAppFlow />
    <section className="cv public-container py-20 sm:py-24" id="application">
      <Reveal className="mb-8 max-w-2xl"><h2 className="text-3xl font-medium leading-tight sm:text-4xl">{c.showTitle}</h2><p className="mt-4 leading-7 text-muted">{c.showSub}</p></Reveal>
      <Reveal variant="scale"><ProductShowcase side /></Reveal>
    </section>
    <DemoBooking />
    <Faq />
    <FinalCta />
  </div>;
}
