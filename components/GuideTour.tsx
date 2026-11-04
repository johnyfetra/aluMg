"use client";
import { ArrowLeft, ArrowRight, BadgePercent, BookOpen, Bell, Boxes, Building2, FilePlus2, FileText, ImagePlus, LayoutTemplate, LifeBuoy, MessageCircle, Send, Sparkles, Store, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n";
import type { Messages } from "@/lib/messages/fr";

// Visite guidée du compte menuisier, dans les vraies pages : chaque étape ouvre l'écran, isole le reste et met en avant le bouton visé.
// Textes : lib/messages (guide.sN.title / guide.sN.text). `target` : sélecteur CSS du premier élément visible ; absent ou introuvable, la bulle est centrée.
// `mobile` : cible de remplacement sous 1024 px (là où la cible habituelle est dans le tiroir de navigation, fermé).
const STEPS = [
  { Icon: Sparkles, route: "/tableau-de-bord" },
  { Icon: Building2, route: "/reglages", target: "#co" },
  { Icon: BadgePercent, route: "/reglages", target: '[data-tour="tariffs"]', mobile: '[data-tour="menu"]' },
  { Icon: Boxes, route: "/fournisseurs", target: "main h1" },
  { Icon: UserRound, route: "/devis/nouveau", target: 'section[aria-labelledby="h-client"]' },
  { Icon: FilePlus2, route: "/devis/nouveau", target: '[data-tour="add-line"]' },
  { Icon: Send, route: "/devis/nouveau", target: '[data-tour="send"]' },
  { Icon: FileText, route: "/devis", target: "main h1" },
  { Icon: Store, route: "/profil-public", target: "main h1" },
  { Icon: ImagePlus, route: "/realisations", target: "main button.btn-primary" },
  { Icon: LayoutTemplate, route: "/modele-devis", target: "main h1" },
  { Icon: MessageCircle, route: "/messages", target: 'nav a[href="/messages"]', mobile: '[data-tour="menu"]' },
  { Icon: Bell, route: "/tableau-de-bord", target: '[data-tour="bell"]' },
  { Icon: LifeBuoy, target: '[data-tour="guide"]' },
] as const;

const PAD = 8; // marge du projecteur autour de l'élément
const visible = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;
};

// L'étape en cours vit dans sessionStorage (une seule source) : la messagerie et le compte ont leur propre Shell, et Next garde les pages quittées en mémoire,
// donc plusieurs copies de ce composant coexistent et doivent toutes voir la même étape.
// shortcut: sans sessionStorage (navigation privée très restrictive) la visite ne démarre pas, le reste de l'application n'en dépend pas.
const STEP_KEY = "alumg.guide.step";
const EVENT = "alumg-guide";
const subscribe = (cb: () => void) => (window.addEventListener(EVENT, cb), () => window.removeEventListener(EVENT, cb));
const readStep = () => {
  try {
    return sessionStorage.getItem(STEP_KEY);
  } catch {
    return null;
  }
};
const go = (n: number | null) => {
  try {
    if (n === null) sessionStorage.removeItem(STEP_KEY);
    else sessionStorage.setItem(STEP_KEY, String(n));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
};
/** Lance (ou relance) la visite depuis n'importe quel écran (page du guide détaillé, bouton « livre »). */
export const startGuide = () => go(0);

// Bouton « livre » de la barre du haut + visite. S'ouvre toute seule à la première connexion du compte, puis seulement sur demande.
// shortcut: « déjà vu » est mémorisé dans ce navigateur (par compte), pas en base ; un nouvel appareil ré-affiche la visite une fois, pour la suivre entre appareils l'ajouter au compte.
export default function GuideTour({ userId }: { userId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const raw = useSyncExternalStore(subscribe, readStep, () => null);
  const step = raw === null ? null : Math.min(Math.max(0, Number(raw) || 0), STEPS.length - 1);
  const [box, setBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const next = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(280); // hauteur réelle de la bulle, pour qu'elle ne sorte jamais de l'écran

  useEffect(() => {
    const key = `alumg.guide.${userId}`;
    try {
      if (localStorage.getItem(key) || !localStorage.getItem("alumg.guide.new")) return;
    } catch {
      return; // stockage indisponible : pas d'ouverture automatique (le bouton reste là)
    }
    const id = setTimeout(() => {
      try {
        localStorage.removeItem("alumg.guide.new");
        localStorage.setItem(key, "1"); // passer ou terminer : la visite ne se relance plus seule
      } catch {}
      go(0);
    }, 600);
    return () => clearTimeout(id);
  }, [userId]);

  // à chaque étape : ouvrir la page, attendre l'élément (chargement), le placer à l'écran puis suivre sa position
  useEffect(() => {
    if (step === null) return;
    const s = STEPS[step];
    if ("route" in s && location.pathname !== s.route) router.push(s.route);
    let ticks = 0;
    const id = setInterval(() => {
      const sel = "target" in s ? ("mobile" in s && !matchMedia("(min-width: 1024px)").matches ? s.mobile : s.target) : undefined;
      const el = sel ? [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.getBoundingClientRect().width > 0) : undefined;
      const top = document.getElementById("topbar")?.getBoundingClientRect().bottom ?? 0; // barre du haut collante : le projecteur reste en dessous
      if (el) {
        // la page bouge encore pendant son chargement : on recentre l'élément pendant ~2 s tant qu'il n'est pas au milieu de l'écran ; un élément plus haut que l'écran est aligné en haut
        const r0 = el.getBoundingClientRect();
        const tall = r0.height > innerHeight - top - 200;
        el.style.scrollMarginTop = `${top + 12}px`;
        if (ticks++ < 14 && (tall ? Math.abs(r0.top - top - 12) > 24 : Math.abs(r0.top + r0.height / 2 - innerHeight / 2) > 24)) el.scrollIntoView({ block: tall ? "start" : "center", behavior: "instant" });
      }
      const r = el && visible(el) ? el.getBoundingClientRect() : null;
      const t = r ? (el?.closest("#topbar") ? r.top - PAD : Math.max(r.top - PAD, top)) : 0; // le cadre est borné à l'écran visible (un grand bloc ne le recouvre pas en entier)
      const b = r && { top: t, left: r.left - PAD, width: r.width + 2 * PAD, height: Math.min(r.bottom + PAD, innerHeight - 8) - t };
      setBox((o) => (o?.top === b?.top && o?.left === b?.left && o?.width === b?.width && o?.height === b?.height ? o : b));
    }, 150);
    return () => clearInterval(id);
  }, [step, router]);

  const open = step !== null;
  useEffect(() => {
    const el = panel.current;
    if (!open || !el) return;
    const ro = new ResizeObserver(([e]) => setH(Math.ceil(e.borderBoxSize?.[0]?.blockSize ?? e.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  useEffect(() => {
    if (step === null) return;
    next.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") go(null);
      if (e.key === "ArrowRight") go(step < STEPS.length - 1 ? step + 1 : null);
      if (e.key === "ArrowLeft") go(Math.max(0, step - 1));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [step]);

  const s = STEPS[step ?? 0];
  const last = step === STEPS.length - 1;
  const k = (part: "title" | "text") => t(`guide.s${(step ?? 0) + 1}.${part}` as keyof Messages);
  const W = Math.min(368, innerWidth - 24);
  // sous l'élément s'il reste la place de toute la bulle, sinon au-dessus, sinon (grand élément) en bas de l'écran
  const below = box ? innerHeight - (box.top + box.height) - 24 >= h : false;
  const above = box ? box.top - 24 >= h : false;
  const card: React.CSSProperties | undefined = open && box
    ? below || above
      ? { left: Math.min(Math.max(12, box.left), innerWidth - W - 12), width: W, ...(below ? { top: box.top + box.height + 12 } : { bottom: innerHeight - box.top + 12 }) }
      : { left: Math.max(12, (innerWidth - W) / 2), bottom: 16, width: W }
    : undefined;

  return (
    <>
      <button type="button" data-tour="guide" onClick={() => (setBox(null), go(0))} aria-label={t("guide.open")} data-tooltip={t("guide.open")} className="grid size-10 place-items-center rounded-full border border-line bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-ink">
        <BookOpen size={18} aria-hidden />
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[200]">
          {/* bloque le reste de l'écran ; le projecteur n'est qu'un cadre lumineux dont l'ombre assombrit tout autour */}
          <div className={`absolute inset-0 ${box ? "" : "bg-black/60"}`} />
          {box && <div aria-hidden className="pointer-events-none absolute rounded-2xl ring-2 ring-accent transition-all duration-200 ease-out" style={{ ...box, boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)" }} />}
          <div ref={panel} role="dialog" aria-labelledby="guide-title" className={`absolute z-10 rounded-2xl border border-line bg-surface p-5 text-ink shadow-[0_24px_64px_rgba(0,0,0,0.4)] ${box ? "" : "inset-0 m-auto h-fit w-[min(24rem,92vw)]"}`} style={card}>
            <div className="mb-1 flex items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t("guide.title")} · {(step ?? 0) + 1}/{STEPS.length}</p>
              <button type="button" onClick={() => go(null)} aria-label={t("guide.skip")} className="ml-auto grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink">
                <X size={16} aria-hidden />
              </button>
            </div>
            {/* navigation rapide : un segment par étape, cliquable (le titre s'affiche au survol) */}
            <div role="group" aria-label={t("guide.steps")} className="mb-4 flex gap-1">
              {STEPS.map((_, i) => (
                <button key={i} type="button" onClick={() => go(i)} title={t(`guide.s${i + 1}.title` as keyof Messages)} aria-label={`${i + 1}. ${t(`guide.s${i + 1}.title` as keyof Messages)}`} aria-current={i === step ? "step" : undefined} className="group flex h-5 flex-1 items-center">
                  <span className={`h-1.5 w-full rounded-full transition-colors group-hover:bg-primary ${i === step ? "bg-primary" : i < step! ? "bg-primary/45" : "bg-surface-2"}`} />
                </button>
              ))}
            </div>
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <s.Icon size={20} aria-hidden />
              </span>
              <div className="min-w-0 space-y-1.5">
                <h2 id="guide-title" className="text-base font-semibold leading-snug">{k("title")}</h2>
                <p className="text-sm leading-relaxed text-muted">{k("text")}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
              {last ? <Link href="/guide" onClick={() => go(null)} className="text-[13px] font-semibold text-primary hover:underline">{t("guide.detail")}</Link> : <button type="button" className="whitespace-nowrap text-[13px] font-medium text-muted hover:text-ink" onClick={() => go(null)}>{t("guide.skip")}</button>}
              <div className="flex gap-2">
                {step! > 0 && (
                  <button type="button" className="btn-secondary !min-h-9 !px-3" onClick={() => go(step! - 1)}>
                    <ArrowLeft size={15} aria-hidden />
                    {t("guide.prev")}
                  </button>
                )}
                <button ref={next} type="button" className="btn-primary !min-h-9 !px-3" onClick={() => go(last ? null : step! + 1)}>
                  {last ? t("guide.done") : t("guide.next")}
                  {!last && <ArrowRight size={15} aria-hidden />}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
