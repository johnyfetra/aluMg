"use client";
import Link from "next/link";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import Brand from "./Brand";
import PublicShell from "./PublicShell";
import { useI18n } from "@/lib/i18n";

// Baie vitrée dont le vantail coulisse (voir .nf-sash) : le « 404 » apparaît dans le vitrage.
function Window404({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 360 260" role="img" aria-label={label} className="mx-auto w-full max-w-md text-ink">
      <rect x="14" y="8" width="332" height="244" rx="8" fill="none" stroke="currentColor" strokeWidth="7" opacity="0.9" />
      <rect x="28" y="22" width="304" height="216" fill="color-mix(in srgb, var(--accent) 12%, transparent)" />
      <path d="M40 40l60 60M70 34l90 90M230 200l70-70" stroke="currentColor" strokeWidth="1.5" opacity="0.12" strokeLinecap="round" />
      <text x="148" y="152" textAnchor="middle" fill="currentColor" style={{ fontFamily: "var(--font-display)", fontSize: 92 }}>404</text>
      <g className="nf-sash">
        <rect x="28" y="22" width="110" height="216" fill="var(--surface)" fillOpacity="0.92" stroke="currentColor" strokeWidth="5" />
        <rect x="38" y="32" width="90" height="196" fill="color-mix(in srgb, var(--accent) 10%, transparent)" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
        <rect x="124" y="110" width="8" height="40" rx="4" fill="var(--accent)" />
      </g>
      <rect x="14" y="238" width="332" height="14" rx="3" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

export function NotFoundView({ embedded = false }: { embedded?: boolean }) {
  const { t } = useI18n();
  const body = (
    <section className="public-container grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2 lg:gap-16" aria-labelledby="nf-title">
      <div>
        <p className="eyebrow">{t("nf.eyebrow")}</p>
        <h1 id="nf-title" className="mt-4 font-[family-name:var(--font-display)] text-[clamp(2.4rem,5vw,4rem)] font-normal leading-[1.04]">{t("nf.title")}</h1>
        <p className="mt-5 max-w-lg leading-7 text-muted">{t("nf.text")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="btn-primary !min-h-12 !px-6">{t("nf.home")}<ArrowRight size={17} aria-hidden /></Link>
          <Link href="/menuisiers" className="btn-secondary !min-h-12 !px-6">{t("nf.find")}</Link>
          <button type="button" onClick={() => history.back()} className="btn-ghost !min-h-12 !px-4"><ArrowLeft size={16} aria-hidden />{t("nf.back")}</button>
        </div>
      </div>
      <Window404 label={t("nf.alt")} />
    </section>
  );
  return embedded ? body : <PublicShell>{body}</PublicShell>;
}

// Page d'erreur inattendue : volontairement sans PublicShell (si l'erreur vient de la barre elle-même, la page ne doit pas replanter).
export function ErrorView({ reset, digest }: { reset: () => void; digest?: string }) {
  const { t } = useI18n();
  return (
    <main className="grid min-h-screen place-items-center px-5 py-16">
      <div className="w-full max-w-xl text-center">
        <Link href="/" aria-label="AluMg" className="inline-block"><Brand /></Link>
        <p className="eyebrow mt-12">{t("er.eyebrow")}</p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-[clamp(2.2rem,5vw,3.4rem)] font-normal leading-[1.05]">{t("er.title")}</h1>
        <p className="mx-auto mt-5 max-w-md leading-7 text-muted">{t("er.text")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn-primary !min-h-12 !px-6"><RotateCcw size={16} aria-hidden />{t("er.retry")}</button>
          <Link href="/" className="btn-secondary !min-h-12 !px-6">{t("nf.home")}</Link>
        </div>
        {digest && <p className="mt-8 font-mono text-xs text-muted">{t("er.ref")} : {digest}</p>}
      </div>
    </main>
  );
}
