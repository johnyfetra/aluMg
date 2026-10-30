"use client";
import Brand from "../Brand";
import { useI18n } from "@/lib/i18n";
import type { Messages } from "@/lib/messages/fr";

export type Variant = "login" | "menuisier" | "client" | "verify";

export default function AtelierShowcase({ variant }: { variant: Variant }) {
  const { t } = useI18n();
  return <>
    <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 lg:hidden"><Brand /><span className="max-w-40 text-right text-xs text-muted">{t("app.tagline")}</span></header>
    <aside className="relative isolate hidden min-h-screen flex-col justify-between overflow-hidden bg-(--hero-to) p-10 text-(--side-fg) lg:flex xl:p-14">
      {/* Un fond uni conserve le contraste si la photographie ne charge pas. */}
      <div aria-hidden className="absolute inset-x-0 top-0 -z-20 h-[34rem] bg-cover bg-[position:center_38%]" style={{ backgroundImage: "url('/brand/realisation-aluminium.webp')" }} />
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-linear-to-b from-(--hero-from)/70 via-transparent to-(--hero-to)" />
      <div><Brand light /><p className="mt-3 text-xs tracking-widest text-(--side-fg)">{t("app.tagline")}</p></div>
      <div className="mt-80 max-w-lg rounded-2xl bg-(--hero-from)/90 p-6 xl:p-8">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-(--side-accent)">{t("ui.signature")}</p>
        <h2 className="text-4xl font-medium leading-[1.15] tracking-tight xl:text-5xl">{t(`auth.hero.${variant}.title` as keyof Messages)}</h2>
        <p className="mt-5 max-w-md text-base leading-relaxed">{t(`auth.hero.${variant}.sub` as keyof Messages)}</p>
        <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/30 pt-6">
          {(["ui.precision", "ui.clarity", "ui.together"] as const).map((key, i) => <p key={key} className="text-sm"><span className="mb-2 block text-xs text-(--side-accent)">0{i + 1}</span>{t(key)}</p>)}
        </div>
      </div>
    </aside>
  </>;
}
