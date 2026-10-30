"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Brand from "../Brand";
import Photo from "../marketing/Photo";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";
import type { Messages } from "@/lib/messages/fr";

export type Variant = "login" | "menuisier" | "client" | "verify";

export default function AtelierShowcase({ variant }: { variant: Variant }) {
  const { t, locale } = useI18n(); const c = marketing[locale];
  return <>
    <header className="border-b border-line lg:hidden"><div className="flex items-center justify-between gap-4 px-5 py-4"><Link href="/" aria-label={c.back}><Brand /></Link><Link href="/" className="inline-flex items-center gap-2 text-xs text-muted"><ArrowLeft size={14} aria-hidden />{c.home}</Link></div><Photo src="/brand/realisation-aluminium.webp" alt={c.loginAlt} priority className="h-40 sm:h-48" position="center 33%" /></header>
    <aside className="hidden min-h-screen flex-col bg-(--hero-to) p-8 text-(--side-fg) lg:flex xl:p-10">
      <div className="flex items-center justify-between gap-4"><Link href="/" aria-label={c.back}><Brand light /></Link><Link href="/" className="inline-flex items-center gap-2 text-xs text-(--side-fg) hover:underline"><ArrowLeft size={14} aria-hidden />{c.home}</Link></div>
      <figure className="mt-8"><Photo src="/brand/realisation-aluminium.webp" alt={c.loginAlt} priority className="h-[clamp(20rem,42vh,32rem)] rounded-xl" position="center 34%" /><figcaption className="mt-2 text-[11px] text-(--side-muted)">{c.editorial}</figcaption></figure>
      <div className="my-auto max-w-xl pt-8"><p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-(--side-accent)">{t("ui.signature")}</p><h2 className="text-3xl font-medium leading-[1.18] tracking-tight xl:text-4xl">{t(`auth.hero.${variant}.title` as keyof Messages)}</h2><p className="mt-4 max-w-lg text-sm leading-7">{t(`auth.hero.${variant}.sub` as keyof Messages)}</p><div className="mt-7 grid grid-cols-3 gap-4 border-t border-white/20 pt-5">{(["ui.precision","ui.clarity","ui.together"] as const).map((key,i)=><p key={key} className="text-xs leading-5"><span className="mb-1 block font-mono text-(--side-accent)">0{i+1}</span>{t(key)}</p>)}</div></div>
    </aside>
  </>;
}
