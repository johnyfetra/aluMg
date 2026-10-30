"use client";
import Link from "next/link";
import { ArrowRight, FileText, MessageSquare, Ruler } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";
import ProductShowcase from "./ProductShowcase";
import Photo from "./Photo";
import ProjectGallery from "./ProjectGallery";
import { FinalCta } from "./MarketingHome";

export function ApplicationPresentation() {
  const { locale } = useI18n(); const c = marketing[locale];
  return <>
    <section className="public-container grid items-center gap-12 py-14 sm:py-24 lg:grid-cols-2"><div className="lg:col-span-2"><p className="eyebrow">{c.appEyebrow}</p><h1 className="mt-5 text-4xl font-medium leading-tight sm:text-6xl">{c.appTitle}</h1><p className="mt-6 text-lg leading-8 text-muted">{c.appIntro}</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/inscription?role=client" className="btn-primary !min-h-12">{c.client}<ArrowRight size={16} aria-hidden /></Link><Link href="/inscription?role=menuisier" className="btn-secondary !min-h-12">{c.pro}</Link></div></div><div className="lg:col-span-2"><ProductShowcase /></div></section>
    <section className="border-y border-line bg-surface"><div className="public-container py-16 sm:py-24"><h2 className="max-w-2xl text-3xl font-medium sm:text-4xl">{c.appDetail}</h2><div className="mt-12 grid gap-10 md:grid-cols-3">{([{Icon:Ruler,title:c.details,text:c.detailsText},{Icon:FileText,title:c.documents,text:c.documentsText},{Icon:MessageSquare,title:c.discussion,text:c.discussionText}]).map(({Icon,title,text})=><article key={title}><Icon size={26} strokeWidth={1.4} aria-hidden className="text-primary" /><h3 className="mt-5 text-xl font-semibold">{title}</h3><p className="mt-3 leading-7 text-muted">{text}</p></article>)}</div></div></section>
    <section className="public-container grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-2"><figure><Photo src="/brand/realisation-aluminium.webp" alt={c.loginAlt} className="aspect-[5/4] rounded-xl" position="center 36%" /><figcaption className="mt-3 text-xs text-muted">{c.editorial}</figcaption></figure><div><p className="eyebrow">{c.precision}</p><h2 className="mt-4 text-3xl font-medium sm:text-4xl">{c.stepsTitle}</h2><ol className="mt-8 space-y-7">{[[c.step1,c.step1d],[c.step2,c.step2d],[c.step3,c.step3d]].map(([title,desc],i)=><li key={title} className="flex gap-5"><span className="mt-1 font-mono text-sm text-primary">0{i+1}</span><div><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-7 text-muted">{desc}</p></div></li>)}</ol></div></section>
    <FinalCta />
  </>;
}

export function PublicProjects() {
  const { locale } = useI18n(); const c = marketing[locale];
  return <>
    <header className="border-b border-line"><div className="public-container grid items-center gap-10 py-12 sm:py-20 lg:grid-cols-[1.2fr_1fr]"><div><p className="eyebrow">{c.projectsEyebrow}</p><h1 className="mt-4 text-4xl font-medium leading-tight sm:text-5xl">{c.projectsTitle}</h1><p className="mt-5 max-w-xl leading-8 text-muted">{c.projectsIntro}</p><Link href="/menuisiers" className="btn-primary mt-7 !min-h-12">{c.find}<ArrowRight size={17} aria-hidden /></Link></div><figure><Photo src="/brand/architecture-aluminium.webp" alt={c.heroAlt} priority className="aspect-[3/2] rounded-xl" /><figcaption className="mt-2 text-xs text-muted">{c.editorial}</figcaption></figure></div></header>
    <section className="public-container py-14 sm:py-20"><h2 className="mb-3 text-2xl font-semibold">{c.gallery}</h2><p className="mb-8 max-w-2xl text-sm leading-7 text-muted">{c.galleryNote}</p><ProjectGallery /></section>
    <FinalCta />
  </>;
}
