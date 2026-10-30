"use client";
import Link from "next/link";
import { ArrowRight, Check, Plus, AppWindow, DoorOpen, PanelsTopLeft, Fence } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";
import { useDirectory } from "@/lib/client";
import MenuisierCard from "../MenuisierCard";
import { EmptyState, ErrorState, LoadingState } from "../Feedback";
import Photo from "./Photo";
import HeroSlider from "./HeroSlider";
import ProductShowcase from "./ProductShowcase";
import ProjectGallery from "./ProjectGallery";

export function FinalCta() {
  const { locale } = useI18n(); const c = marketing[locale];
  return <section className="border-t border-line bg-surface"><div className="public-container py-16 text-center sm:py-24"><p className="eyebrow">{c.question}</p><h2 className="mx-auto mt-4 max-w-3xl text-3xl font-medium tracking-tight sm:text-5xl">{c.finalTitle}</h2><p className="mt-5 text-muted">{c.finalSub}</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/menuisiers" className="btn-primary !min-h-12 !px-6">{c.find}<ArrowRight size={17} aria-hidden /></Link><Link href="/inscription?role=menuisier" className="btn-secondary !min-h-12 !px-6">{c.pro}</Link></div></div></section>;
}

export default function MarketingHome() {
  const { t, locale } = useI18n(); const c = marketing[locale];
  const { data, error, isLoading, mutate } = useDirectory({ sort: "rating" });
  return <>
    <section className="public-container pb-12 pt-4 sm:pt-6 lg:pb-16" aria-labelledby="home-title"><HeroSlider /></section>
    <div className="border-y border-line bg-surface"><ul className="public-container grid gap-5 py-6 sm:grid-cols-3">{[c.benefit1,c.benefit2,c.benefit3].map((label,i)=><li key={label} className="flex items-center gap-4 text-sm font-medium"><span className="font-mono text-xs text-muted">0{i+1}</span><span>{label}</span></li>)}</ul></div>
    <section className="public-container py-14 sm:py-20" id="application">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-4"><div><p className="eyebrow">{c.appEyebrow}</p><h2 className="mt-3 max-w-xl text-3xl font-medium leading-tight sm:text-4xl">{c.appTitle}</h2></div><div className="max-w-md"><p className="leading-7 text-muted">{c.appIntro}</p><Link href="/application" className="mt-3 inline-flex items-center gap-2 font-semibold text-primary hover:underline">{c.discover}<ArrowRight size={17} aria-hidden /></Link></div></div>
      <ProductShowcase side />
    </section>
    <section id="savoir-faire" className="scroll-mt-28 border-y border-line bg-surface"><div className="public-container py-20 sm:py-24"><div className="mb-10 flex flex-wrap items-end justify-between gap-6"><div><p className="eyebrow">{c.projectsEyebrow}</p><h2 className="mt-4 max-w-2xl text-3xl font-medium sm:text-4xl">{c.projectsTitle}</h2><p className="mt-4 max-w-xl leading-7 text-muted">{c.projectsIntro}</p></div><Link href="/realisations-menuiserie" className="btn-secondary">{c.projectsLink}<ArrowRight size={16} aria-hidden /></Link></div><ProjectGallery limit={3} />
      <div className="mt-10 grid grid-cols-2 gap-3 border-t border-line pt-8 md:grid-cols-4">{([["fenetres",AppWindow],["portes",DoorOpen],["cloisons",PanelsTopLeft],["garde-corps",Fence]] as const).map(([key,Icon])=><Link href={`/menuisiers?specialty=${key}`} key={key} className="flex min-h-14 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-surface-2"><Icon size={19} aria-hidden className="text-primary" />{t(`spec.${key}`)}<ArrowRight size={14} className="ml-auto shrink-0" aria-hidden /></Link>)}</div>
    </div></section>
    <section className="public-container py-20 sm:py-24"><div className="mb-10 flex flex-wrap items-end justify-between gap-6"><div><h2 className="max-w-2xl text-3xl font-medium sm:text-4xl">{c.peopleTitle}</h2><p className="mt-4 max-w-xl leading-7 text-muted">{c.peopleIntro}</p></div><Link href="/menuisiers" className="inline-flex items-center gap-2 font-semibold text-primary hover:underline">{c.all}<ArrowRight size={17} aria-hidden /></Link></div>{error ? <ErrorState retry={()=>{void mutate();}} /> : isLoading ? <LoadingState /> : !data?.length ? <EmptyState message={c.peopleEmpty}><Link href="/inscription?role=menuisier" className="btn-primary">{c.pro}</Link></EmptyState> : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{data.slice(0,3).map(m=><MenuisierCard key={m.slug} m={m} />)}</div>}</section>
    <section className="bg-(--side-bg) text-(--side-fg)"><div className="public-container grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:gap-20"><figure><Photo src="/brand/precision-aluminium.webp" alt={c.craftAlt} className="aspect-[5/4] rounded-xl" /><figcaption className="mt-3 text-xs text-(--side-muted)">{c.editorial}</figcaption></figure><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-(--side-accent)">{c.pro}</p><h2 className="mt-5 text-3xl font-medium leading-tight sm:text-4xl">{c.craftTitle}</h2><p className="mt-5 leading-7 text-(--side-fg)">{c.craftIntro}</p><ul className="mt-6 space-y-3">{[c.pro1,c.pro2,c.pro3,c.pro4].map(x=><li key={x} className="flex items-start gap-3 text-sm"><Check size={17} className="mt-0.5 shrink-0 text-(--side-accent)" aria-hidden />{x}</li>)}</ul><Link href="/inscription?role=menuisier" className="btn-accent mt-8 !min-h-12 !px-6">{c.start}<ArrowRight size={17} aria-hidden /></Link></div></div></section>
    <section className="public-container py-20 sm:py-24"><h2 className="max-w-2xl text-3xl font-medium sm:text-4xl">{c.stepsTitle}</h2><ol className="mt-12 grid gap-10 md:grid-cols-3">{[[c.step1,c.step1d],[c.step2,c.step2d],[c.step3,c.step3d]].map(([title,desc],i)=><li key={title} className="border-t border-line pt-6"><span className="font-mono text-sm text-primary">0{i+1}</span><h3 className="mt-5 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-muted">{desc}</p></li>)}</ol></section>
    <section className="public-container grid gap-8 border-t border-line py-16 lg:grid-cols-[1fr_1.6fr]"><h2 className="text-3xl font-medium">{c.faq}</h2><div>{[[c.q1,c.a1],[c.q2,c.a2],[c.q3,c.a3],[c.q4,c.a4]].map(([q,a])=><details key={q} className="group border-b border-line"><summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-semibold [&::-webkit-details-marker]:hidden">{q}<Plus size={18} className="shrink-0 transition-transform group-open:rotate-45" aria-hidden /></summary><p className="max-w-2xl pb-6 text-sm leading-7 text-muted">{a}</p></details>)}</div></section>
    <FinalCta />
  </>;
}
