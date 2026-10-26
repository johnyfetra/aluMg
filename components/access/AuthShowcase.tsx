"use client";
import { Bell, CheckCircle2, FileDown, Ruler, ShieldCheck } from "lucide-react";
import { useRef } from "react";
import { useParallax } from "./useParallax";
import { drawingSvg } from "@/lib/drawing";
import { useI18n } from "@/lib/i18n";
import { lineSchema } from "@/lib/model";
import type { Messages } from "@/lib/messages/fr";

export type Variant = "login" | "menuisier" | "client" | "verify";

// Fenêtre d'exemple pour la maquette de devis (même moteur de dessin que l'application).
const SAMPLE_SVG = drawingSvg(
  lineSchema.parse({ id: "auth", category: "fenetre", opening: "coulissant", leaves: 2, shutter: "roulant", control: "manuel", guard: "barreaudage", range: "asiatique", finish: "anthracite", infill: "vitree", glassType: "clair", thickness: "5", pattern: "none", extras: [], width: 1500, height: 1200, qty: 1, unit: 480000 }),
  "auth",
  200,
  150,
).svg;

const key = (v: Variant, n: 1 | 2 | 3, d = false) => `auth.step.${v === "login" || v === "verify" ? "menuisier" : v}.${n}${d ? "d" : ""}` as keyof Messages;

// Moitié « présentation » de l'écran de connexion / d'inscription : ce que fait l'application, expliqué en trois étapes, selon le profil choisi.
export default function AuthShowcase({ variant }: { variant: Variant }) {
  const { t } = useI18n();
  const host = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  useParallax(stage, host);
  return (
    <>
      {/* mobile : bandeau compact */}
      <header className="relative isolate overflow-hidden bg-gradient-to-br from-(--hero-from) to-(--hero-to) px-5 py-5 text-white lg:hidden">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="grid size-9 place-items-center rounded-lg bg-primary text-on-primary"><Ruler size={19} /></span>
          <span className="text-lg font-bold tracking-tight">AluMg</span>
        </div>
        <p className="mt-2 max-w-sm text-sm leading-snug text-white/75">{t(`auth.hero.${variant}.title` as keyof Messages)}</p>
      </header>

      {/* ordinateur : panneau complet */}
      <aside ref={host} className="relative isolate z-10 hidden overflow-hidden bg-gradient-to-br from-(--hero-from) to-(--hero-to) text-white shadow-[24px_0_60px_-24px_rgb(0_0_0/0.6)] lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-10 xl:px-16">
        <div aria-hidden className="absolute -left-24 top-1/3 -z-10 size-96 rounded-full bg-primary/25 blur-3xl" />
        <div aria-hidden className="absolute -right-20 -top-16 -z-10 size-80 rounded-full bg-rose-500/10 blur-3xl" />
        <div aria-hidden className="absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_30%_40%,#000,transparent_72%)]" />

        <div className="flex items-center gap-3">
          <span aria-hidden className="grid size-10 place-items-center rounded-xl bg-primary text-on-primary"><Ruler size={22} /></span>
          <div>
            <p className="text-xl font-bold leading-tight tracking-tight">AluMg</p>
            <p className="text-xs leading-tight text-white/60">{t("app.tagline")}</p>
          </div>
        </div>

        <div className="max-w-xl space-y-8 py-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold leading-tight tracking-tight xl:text-4xl">{t(`auth.hero.${variant}.title` as keyof Messages)}</h2>
            <p className="max-w-lg text-base leading-relaxed text-white/70">{t(`auth.hero.${variant}.sub` as keyof Messages)}</p>
          </div>

          {/* maquette en 3D : calques à des profondeurs différentes, qui s'inclinent vers le pointeur */}
          <div className="auth-persp relative max-w-md" aria-hidden>
            <div ref={stage} className="auth-stage relative">
              <div className="auth-layer absolute inset-0 rounded-2xl border border-white/5 bg-white/[0.03]" style={{ transform: "translate3d(14px,16px,-60px)" }} />
              <div className="auth-layer absolute inset-0 rounded-2xl border border-white/5 bg-white/[0.04]" style={{ transform: "translate3d(7px,8px,-30px)" }} />
              <div className="auth-layer relative rounded-2xl border border-white/15 bg-white/[0.08] p-4 shadow-2xl backdrop-blur" style={{ transform: "translateZ(20px)" }}>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-28 shrink-0 rounded-lg bg-white p-1 [&>svg]:h-full [&>svg]:w-full" style={{ transform: "translateZ(24px)" }} dangerouslySetInnerHTML={{ __html: SAMPLE_SVG }} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">DV-2026-0001 · F-01</p>
                    <p className="truncate text-sm font-semibold">Fenêtre coulissante 2 vantaux</p>
                    <p className="text-xs text-white/60">1500 × 1200 mm · Gris anthracite</p>
                    <p className="text-lg font-bold tabular-nums">1 968 000 <span className="text-xs font-semibold text-white/60">Ar</span></p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 font-semibold text-emerald-300"><CheckCircle2 size={13} />{t("auth.mock.status")}</span>
                  <span className="text-white/50">TTC · 30 %</span>
                </div>
              </div>
              <div className="auth-layer auth-float absolute -bottom-6 -right-5 flex items-center gap-2 rounded-xl border border-white/10 bg-(--hero-from) px-3 py-2 text-xs font-medium shadow-xl" style={{ transform: "translateZ(80px)" }}>
                <span className="grid size-6 place-items-center rounded-full bg-primary text-on-primary"><Bell size={12} /></span>
                {t("auth.mock.comment")}
              </div>
              <div className="auth-layer auth-float-slow absolute -left-5 -top-5 flex items-center gap-2 rounded-xl border border-white/10 bg-(--hero-from) px-3 py-2 text-xs font-medium shadow-xl" style={{ transform: "translateZ(60px)" }}>
                <span className="grid size-6 place-items-center rounded-full bg-white/10 text-white"><FileDown size={12} /></span>
                PDF · NIF · STAT
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">{t("auth.how")}</p>
            <ol className="space-y-3.5">
              {([1, 2, 3] as const).map((n) => (
                <li key={n} className="auth-rise flex gap-3.5" style={{ animationDelay: `${120 + n * 90}ms` }}>
                  <span aria-hidden className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold ring-1 ring-white/15">{n}</span>
                  <div>
                    <p className="text-sm font-semibold">{t(key(variant, n))}</p>
                    <p className="text-sm text-white/60">{t(key(variant, n, true))}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-white/55">
          <ShieldCheck size={15} aria-hidden className="mt-0.5 shrink-0 text-white/70" />
          {t("auth.trust")}
        </p>
      </aside>
    </>
  );
}
