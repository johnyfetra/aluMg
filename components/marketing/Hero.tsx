"use client";
import { ArrowRight, CalendarCheck, Check, Smartphone } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";
import Shot from "./Shot";

// Premier écran : la promesse (devis pro, WhatsApp, marge), les deux parcours du menuisier et une vraie capture du devis en cours.
// Entrée en cascade au chargement (classes hero-in, globals.css) ; sans animation si l'utilisateur préfère moins de mouvement.
export default function Hero() {
  const { locale, t } = useI18n();
  const c = marketing[locale];
  return (
    <section className="public-container grid items-center gap-10 pb-16 pt-8 sm:pt-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-14 lg:pb-24" aria-labelledby="home-title">
      <div>
        <p className="hero-in eyebrow flex items-center gap-3"><span className="h-px w-8 shrink-0 bg-accent" />{c.eyebrow}</p>
        <h1 id="home-title" className="hero-in mt-5 font-[family-name:var(--font-display)] text-[clamp(2.5rem,6.2vw,4.6rem)] font-normal leading-[1.02] tracking-[-0.015em]" style={{ "--i": 1 } as React.CSSProperties}>
          {c.heroTitle} <em className="text-primary">{c.heroTitleEnd}</em>
        </h1>
        <p className="hero-in mt-6 max-w-xl text-[15px] leading-7 text-muted sm:text-lg sm:leading-8" style={{ "--i": 2 } as React.CSSProperties}>{c.heroIntro}</p>
        <div className="hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap" style={{ "--i": 3 } as React.CSSProperties}>
          <Link href="/inscription?role=menuisier" className="btn-accent !min-h-12 !px-6 !text-[15px]">{c.start}<ArrowRight size={17} aria-hidden /></Link>
          <a href="#demo" className="btn-secondary !min-h-12 !px-6 !text-[15px]"><CalendarCheck size={17} aria-hidden />{c.demoHero}</a>
        </div>
        <ul className="hero-in mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted" style={{ "--i": 4 } as React.CSSProperties}>
          {[c.proof1, c.proof2, c.proof3].map((x) => <li key={x} className="flex items-center gap-2"><Check size={15} aria-hidden className="shrink-0 text-ok" />{x}</li>)}
        </ul>
      </div>
      <figure className="hero-in relative" style={{ "--i": 2 } as React.CSSProperties}>
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-(--shadow-overlay)">
          <div className="flex items-center gap-2 border-b border-line bg-surface-2/60 px-3 py-2" aria-hidden>
            <span className="flex gap-1.5">{[0, 1, 2].map((n) => <span key={n} className="size-2.5 rounded-full bg-line" />)}</span>
            <span className="ml-2 rounded-md bg-surface px-3 py-0.5 text-[11px] text-muted">app.alumg.mg</span>
          </div>
          <div className="aspect-[1500/938]"><Shot id="pro-quote" alt={c.heroShotAlt} priority /></div>
        </div>
        {/* la réponse du client, telle que WhatsApp la montre : le texte est celui que le lien public envoie vraiment */}
        <p aria-hidden className="absolute -bottom-4 left-3 max-w-[78%] rounded-2xl rounded-bl-sm bg-mine px-4 py-2.5 text-sm font-medium text-on-mine shadow-(--shadow-card) ring-1 ring-line sm:left-6">{t("share.acceptMsg")}</p>
        <figcaption className="mt-9 flex items-center gap-2 text-xs text-muted sm:justify-end"><Smartphone size={14} aria-hidden className="text-accent" /><Link href="/telecharger" className="hover:text-ink hover:underline">{c.heroAside}</Link><span aria-hidden>·</span><span>{c.showNote}</span></figcaption>
      </figure>
    </section>
  );
}
