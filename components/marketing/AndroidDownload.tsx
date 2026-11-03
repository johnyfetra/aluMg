"use client";
import { Download, ShieldCheck, Smartphone, WifiOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";

// Page de téléchargement de l'APK (public/downloads/AluMg.apk, construit par mobile/build-apk.sh). Version et taille : à tenir à jour dans lib/marketing.ts (apkMeta) à chaque nouvelle version.
export default function AndroidDownload() {
  const { locale } = useI18n();
  const c = marketing[locale];
  const steps = [[c.apk1, c.apk1d], [c.apk2, c.apk2d], [c.apk3, c.apk3d]] as const;
  return (
    <>
      <section className="public-container py-12 sm:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_.8fr]">
          <div>
            <p className="eyebrow">{c.apkEyebrow}</p>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-[clamp(2.2rem,5vw,3.8rem)] font-normal leading-[1.04] tracking-[-0.01em]">{c.apkTitle}</h1>
            <p className="mt-5 max-w-xl leading-7 text-muted">{c.apkIntro}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <a href="/downloads/AluMg.apk" download className="btn-accent !rounded-full !px-6 !py-3">
                <Download size={18} aria-hidden />
                {c.apkButton}
              </a>
              <span className="text-sm text-muted">{c.apkMeta}</span>
            </div>
            <p className="mt-4 text-xs text-muted">
              <a href="/downloads/AluMg.apk.sha256" className="underline underline-offset-2 hover:text-ink">{c.apkHash}</a>
            </p>
          </div>
          <div className="mx-auto grid size-40 place-items-center rounded-[2.2rem] bg-[#243B32] shadow-[0_24px_60px_rgba(36,59,50,0.35)] sm:size-52" aria-hidden>
            <svg viewBox="0 0 32 32" className="size-24 sm:size-32"><path d="M4 4h8v16h16v8H4z" fill="#F6F3ED" /><path d="M16 4h12v12H16z" fill="#C58A58" /></svg>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="public-container py-14 sm:py-20">
          <h2 className="max-w-2xl text-3xl font-medium sm:text-4xl">{c.apkStepsTitle}</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map(([title, text], i) => (
              <li key={title}>
                <span className="grid size-10 place-items-center rounded-full bg-accent/15 font-mono text-sm font-bold text-accent">{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="public-container py-14 sm:py-20">
        <h2 className="text-2xl font-medium sm:text-3xl">{c.apkNeedTitle}</h2>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2">
          {([[WifiOff, c.apkNeed1], [Smartphone, c.apkNeed2], [Download, c.apkNeed3], [ShieldCheck, c.apkNeed4]] as const).map(([Icon, text]) => (
            <li key={text} className="flex gap-4">
              <Icon size={20} aria-hidden className="mt-0.5 shrink-0 text-accent" />
              <p className="text-sm leading-6 text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
