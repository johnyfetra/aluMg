"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { ArrowRight, Check, ChevronDown, AppWindow, DoorOpen, PanelsTopLeft, Fence } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";
import { useDirectory } from "@/lib/client";
import MenuisierCard from "../MenuisierCard";
import { EmptyState, ErrorState, LoadingState } from "../Feedback";
import Photo from "./Photo";
import HeroSlider from "./HeroSlider";
import ProjectGallery from "./ProjectGallery";
import WorkPicker from "./WorkPicker";
import AssemblySteps from "./AssemblySteps";
import Reveal from "./Reveal";
import DemoBooking from "./DemoBooking";

// La pile de captures 3D est lourde et sous le pli : chargée à part, sa place est réservée (même rapport) pour ne rien décaler.
const ProductShowcase = dynamic(() => import("./ProductShowcase"), { loading: () => <div className="aspect-[3/2] md:aspect-[2/1]" /> });

export function FinalCta() {
  const { locale } = useI18n(); const c = marketing[locale];
  return <section className="border-t border-line bg-surface"><div className="public-container py-16 text-center sm:py-24"><p className="eyebrow">{c.question}</p><h2 className="mx-auto mt-4 max-w-3xl text-3xl font-medium tracking-tight sm:text-5xl">{c.finalTitle}</h2><p className="mt-5 text-muted">{c.finalSub}</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/menuisiers" className="btn-primary !min-h-12 !px-6">{c.find}<ArrowRight size={17} aria-hidden /></Link><Link href="/inscription?role=menuisier" className="btn-secondary !min-h-12 !px-6">{c.pro}</Link><Link href="/#demo" className="btn-secondary !min-h-12 !px-6">{c.demoCta}</Link></div></div></section>;
}

// Questions / réponses : deux colonnes (client, menuisier), questions en serif italique, ouverture native sans JS.
function Faq() {
  const { locale } = useI18n(); const c = marketing[locale];
  const cols = [[c.faqClient, [[c.cq1, c.ca1], [c.cq2, c.ca2], [c.cq3, c.ca3], [c.cq4, c.ca4]]], [c.faqPro, [[c.pq1, c.pa1], [c.pq2, c.pa2], [c.pq3, c.pa3]]]] as const;
  return <section className="faq cv border-t border-line" aria-labelledby="faq-title"><div className="public-container py-20 sm:py-28">
    <Reveal className="max-w-2xl"><h2 id="faq-title" className="font-[family-name:var(--font-display)] text-4xl font-normal leading-tight sm:text-5xl">{c.faq}</h2><p className="mt-4 leading-7 text-muted">{c.faqIntro} <span className="whitespace-nowrap text-ink">— {c.faqSign}</span></p></Reveal>
    <div className="mt-14 grid gap-14 lg:grid-cols-2 lg:gap-20">{cols.map(([who, qs]) => <Reveal key={who}>
      <h3 className="eyebrow flex items-center gap-3"><span className="h-px w-8 bg-accent" />{who}</h3>
      <div className="mt-4">{qs.map(([q, a], i) => <details key={q} className="group border-b border-line">
        <summary className="flex list-none items-baseline gap-4 py-5 [&::-webkit-details-marker]:hidden"><span className="w-6 shrink-0 font-mono text-xs text-muted group-open:text-accent">0{i + 1}</span><span className="font-[family-name:var(--font-display)] text-[1.45rem] italic leading-snug group-hover:text-primary group-open:text-primary">{q}</span><ChevronDown size={18} aria-hidden className="ml-auto shrink-0 self-center text-muted transition-transform duration-300 group-open:rotate-180" /></summary>
        <p className="max-w-xl pb-6 pl-10 text-[15px] leading-7 text-muted">{a}</p>
      </details>)}</div>
    </Reveal>)}</div>
    <Reveal className="mt-14 flex flex-wrap items-baseline gap-x-4 gap-y-2 border-t border-line pt-8"><p className="font-[family-name:var(--font-display)] text-2xl italic">{c.faqMore}</p><p className="text-muted">{c.faqMoreText}</p><Link href="/menuisiers" className="inline-flex items-center gap-2 font-semibold text-primary hover:underline">{c.find}<ArrowRight size={16} aria-hidden /></Link></Reveal>
  </div></section>;
}

export default function MarketingHome() {
  const { t, locale } = useI18n(); const c = marketing[locale];
  const { data, error, isLoading, mutate } = useDirectory({ limit: "3" }); // la page n'affiche que trois menuisiers : on n'en demande pas plus
  return <div className="home">
    <section className="public-container pb-12 pt-4 sm:pt-6 lg:pb-16" aria-labelledby="home-title"><HeroSlider /></section>
    <div id="suite" className="scroll-mt-28"><WorkPicker /></div>
    <div className="border-y border-line bg-surface"><Reveal as="ul" stagger className="public-container grid gap-5 py-6 sm:grid-cols-3">{[c.benefit1,c.benefit2,c.benefit3].map((label,i)=><li key={label} className="flex items-center gap-4 text-sm font-medium"><span className="font-mono text-xs text-muted">0{i+1}</span><span>{label}</span></li>)}</Reveal></div>
    <section id="savoir-faire" className="cv scroll-mt-28"><div className="public-container py-20 sm:py-24"><Reveal className="mb-10 flex flex-wrap items-end justify-between gap-6"><div><p className="eyebrow">{c.projectsEyebrow}</p><h2 className="mt-4 max-w-2xl text-3xl font-medium sm:text-4xl">{c.projectsTitle}</h2><p className="mt-4 max-w-xl leading-7 text-muted">{c.projectsIntro}</p></div><Link href="/realisations-menuiserie" className="btn-secondary">{c.projectsLink}<ArrowRight size={16} aria-hidden /></Link></Reveal><Reveal variant="clip"><Suspense><ProjectGallery limit={6} /></Suspense></Reveal>
      <Reveal stagger className="mt-10 grid grid-cols-2 gap-3 border-t border-line pt-8 md:grid-cols-4">{([["fenetres",AppWindow],["portes",DoorOpen],["cloisons",PanelsTopLeft],["garde-corps",Fence]] as const).map(([key,Icon])=><Link href={`/menuisiers?specialty=${key}`} key={key} className="flex min-h-14 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-surface-2"><Icon size={19} aria-hidden className="text-primary" />{t(`spec.${key}`)}<ArrowRight size={14} className="ml-auto shrink-0" aria-hidden /></Link>)}</Reveal>
    </div></section>
    <div className="border-y border-line bg-surface"><AssemblySteps /></div>
    <section className="cv public-container py-20 sm:py-24" id="application">
      <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-4"><div><p className="eyebrow">{c.appEyebrow}</p><h2 className="mt-3 max-w-xl text-3xl font-medium leading-tight sm:text-4xl">{c.appTitle}</h2></div><div className="max-w-md"><p className="leading-7 text-muted">{c.appIntro}</p><Link href="/application" className="mt-3 inline-flex items-center gap-2 font-semibold text-primary hover:underline">{c.discover}<ArrowRight size={17} aria-hidden /></Link></div></Reveal>
      <Reveal variant="scale"><ProductShowcase side /></Reveal>
    </section>
    <section className="cv border-t border-line public-container py-20 sm:py-24"><Reveal className="mb-10 flex flex-wrap items-end justify-between gap-6"><div><h2 className="max-w-2xl text-3xl font-medium sm:text-4xl">{c.peopleTitle}</h2><p className="mt-4 max-w-xl leading-7 text-muted">{c.peopleIntro}</p></div><Link href="/menuisiers" className="inline-flex items-center gap-2 font-semibold text-primary hover:underline">{c.all}<ArrowRight size={17} aria-hidden /></Link></Reveal>{error ? <ErrorState retry={()=>{void mutate();}} /> : isLoading ? <LoadingState /> : !data?.length ? <EmptyState message={c.peopleEmpty}><Link href="/inscription?role=menuisier" className="btn-primary">{c.pro}</Link></EmptyState> : <Reveal stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{data.slice(0,3).map(m=><MenuisierCard key={m.slug} m={m} />)}</Reveal>}</section>
    <section className="cv bg-(--side-bg) text-(--side-fg)"><div className="public-container grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:gap-20"><Reveal as="figure" variant="clip"><div className="tint rounded-xl"><Photo src="/brand/precision-aluminium.webp" alt={c.craftAlt} className="aspect-[5/4] rounded-xl" /></div><figcaption className="mt-3 text-xs text-(--side-muted)">{c.editorial}</figcaption></Reveal><Reveal variant="right"><p className="text-xs font-semibold uppercase tracking-[.16em] text-(--side-accent)">{c.pro}</p><h2 className="mt-5 text-3xl font-medium leading-tight sm:text-4xl">{c.craftTitle}</h2><p className="mt-5 leading-7 text-(--side-fg)">{c.craftIntro}</p><ul className="mt-6 space-y-3">{[c.pro1,c.pro2,c.pro3,c.pro4].map(x=><li key={x} className="flex items-start gap-3 text-sm"><Check size={17} className="mt-0.5 shrink-0 text-(--side-accent)" aria-hidden />{x}</li>)}</ul><Link href="/inscription?role=menuisier" className="btn-accent mt-8 !min-h-12 !px-6">{c.start}<ArrowRight size={17} aria-hidden /></Link></Reveal></div></section>
    <DemoBooking />
    <Faq />
    <FinalCta />
  </div>;
}
