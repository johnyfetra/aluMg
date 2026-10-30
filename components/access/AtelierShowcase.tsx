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
    <aside className="relative hidden overflow-hidden bg-(--hero-to) text-white lg:sticky lg:top-0 lg:block lg:h-screen lg:self-start">
      <div className="absolute inset-0"><Photo src="/brand/realisation-aluminium.webp" alt={c.loginAlt} priority className="h-full" position="center 30%" /></div>
      <span aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/45 from-0% via-transparent via-40% to-black/92" />
      <div className="relative flex h-full flex-col justify-between p-8 xl:p-10">
        <div className="flex items-center justify-between gap-4"><Link href="/" aria-label={c.back}><Brand light /></Link><Link href="/" className="inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1.5 text-xs backdrop-blur-md hover:bg-black/40"><ArrowLeft size={14} aria-hidden />{c.home}</Link></div>
        <div className="max-w-md">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">{t("ui.signature")}</p>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-normal leading-[1.1] xl:text-4xl">{t(`auth.hero.${variant}.title` as keyof Messages)}</h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/85">{t(`auth.hero.${variant}.sub` as keyof Messages)}</p>
          <div className="mt-7 grid grid-cols-3 gap-4 border-t border-white/25 pt-5">{(["ui.precision","ui.clarity","ui.together"] as const).map((key,i)=><p key={key} className="text-xs leading-5 text-white/90"><span className="mb-1 block font-mono text-(--side-accent)">0{i+1}</span>{t(key)}</p>)}</div>
          <p className="mt-5 text-[11px] text-white/60">{c.editorial}</p>
        </div>
      </div>
    </aside>
  </>;
}
