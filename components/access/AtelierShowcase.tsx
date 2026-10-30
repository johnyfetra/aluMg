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
  // mise en valeur du cœur de la phrase : le cœur de la phrase (entre virgules, ou après la virgule) passe en italique cuivré
  const full = t(`auth.hero.${variant}.title` as keyof Messages) as string;
  const at = full.indexOf(","), tail = full.lastIndexOf(",");
  const title = at > 0 ? (tail > at ? [full.slice(0, at + 1) + " ", full.slice(at + 2, tail + 1), full.slice(tail + 1)] : [full.slice(0, at + 1) + " ", full.slice(at + 2), ""]) : [full, "", ""];
  return <>
    <header className="border-b border-line lg:hidden"><div className="flex items-center justify-between gap-4 px-5 py-4"><Link href="/" aria-label={c.back}><Brand /></Link><Link href="/" className="inline-flex items-center gap-2 text-xs text-muted"><ArrowLeft size={14} aria-hidden />{c.home}</Link></div><Photo src="/brand/realisation-aluminium.webp" alt={c.loginAlt} priority className="h-40 sm:h-48" position="center 33%" /></header>
    <aside className="relative hidden overflow-hidden bg-(--hero-to) text-white lg:sticky lg:top-0 lg:block lg:h-screen lg:self-start">
      <div className="absolute inset-0"><Photo src="/brand/realisation-aluminium.webp" alt={c.loginAlt} priority className="h-full" position="center 30%" /></div>
      <span aria-hidden className="absolute inset-0 bg-gradient-to-b from-[#17231d]/90 from-0% via-transparent via-30% to-[#17231d]/95" />
      <div className="relative flex h-full flex-col justify-between p-8 xl:p-10">
        <div><Link href="/" aria-label={c.back}><Brand light /></Link><p className="mt-3 text-xs tracking-[0.14em] text-white [text-shadow:0_1px_8px_rgb(0_0_0/0.6)]">{t("app.tagline")}</p></div>
        <div className="max-w-lg rounded-2xl bg-[#17231d]/75 p-7 backdrop-blur-md shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)] xl:p-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-(--side-accent)">{t("ui.signature")}</p>
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(2.1rem,3vw,2.9rem)] font-normal leading-[1.06] text-white">{title[0]}{title[1] && <em className="text-(--side-accent)">{title[1]}</em>}{title[2]}</h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/90">{t(`auth.hero.${variant}.sub` as keyof Messages)}</p>
          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/20 pt-5">{(["ui.precision","ui.clarity","ui.together"] as const).map((key,i)=><p key={key} className="text-xs leading-5 text-white/90"><span className="mb-1 block font-mono text-(--side-accent)">0{i+1}</span>{t(key)}</p>)}</div>
        </div>
      </div>
    </aside>
  </>;
}
