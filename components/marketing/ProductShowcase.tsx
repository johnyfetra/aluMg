"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";

// Vraies captures de l'application (données d'exemple), en clair et en sombre selon le thème, dans un cadre de navigateur ou de téléphone.
const TABS = [
  { id: "pro-dashboard", alt: 1 },
  { id: "pro-quote", alt: 2 },
  { id: "client-quote", alt: 3 },
  { id: "client-mobile", alt: 4 },
] as const;

export default function ProductShowcase({ compact = false }: { compact?: boolean }) {
  const { locale } = useI18n();
  const c = marketing[locale];
  const [i, setI] = useState(0);
  const tab = TABS[i];
  const label = [c.tab1, c.tab2, c.tab3, c.tab4][i];
  const caption = [c.cap1, c.cap2, c.cap3, c.cap4][i];
  const phone = tab.id === "client-mobile";
  return (
    <figure className="min-w-0">
      <div role="tablist" aria-label={c.showTitle} className="no-scrollbar mb-5 flex gap-1.5 overflow-x-auto">
        {[c.tab1, c.tab2, c.tab3, c.tab4].map((name, n) => (
          <button key={n} type="button" role="tab" id={`show-tab-${n}`} aria-selected={n === i} aria-controls="show-panel" onClick={() => setI(n)} className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${n === i ? "border-primary bg-primary/10 text-primary" : "border-line text-muted hover:text-ink"}`}>
            {name}
          </button>
        ))}
      </div>
      <div id="show-panel" role="tabpanel" aria-labelledby={`show-tab-${i}`} className={`relative overflow-hidden rounded-2xl border border-line bg-surface-2 ${phone ? "px-6 pt-8 sm:px-16" : ""}`}>
        <div key={i} className="show-in">
        {phone ? (
          <div className="mx-auto w-full max-w-[17rem] rounded-t-[2.2rem] border-[7px] border-b-0 border-ink/85 bg-ink/85 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.55)]">
            <Shot id={tab.id} alt={`${label}. ${caption}`} cls="rounded-t-[1.7rem]" />
          </div>
        ) : (
          <div className="shadow-[0_30px_80px_-40px_rgb(0_0_0/0.5)]">
            <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5" aria-hidden>
              <span className="group/dots flex gap-2">
                {[["#ff5f57", "M2 2l6 6M8 2L2 8"], ["#febc2e", "M2 5h6"], ["#28c840", "M5 2v6M2 5h6"]].map(([color, glyph]) => (
                  <span key={color} className="grid size-3 place-items-center rounded-full shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.18)]" style={{ background: color }}>
                    <svg viewBox="0 0 10 10" className="size-2 opacity-0 transition-opacity group-hover/dots:opacity-60" fill="none" stroke="#3a1c1a" strokeWidth="1.4" strokeLinecap="round"><path d={glyph} /></svg>
                  </span>
                ))}
              </span>
              <span className="ml-3 truncate rounded-md bg-surface-2 px-3 py-0.5 text-[11px] text-muted">app.alumg.mg</span>
            </div>
            <Shot id={tab.id} alt={`${label}. ${caption}`} cls="" />
          </div>
        )}
        </div>
      </div>
      <figcaption className={`mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 ${compact ? "text-sm" : ""}`}>
        <p className="max-w-2xl text-sm leading-6 text-muted">{caption}</p>
        <p className="text-xs text-muted">{c.showNote}</p>
      </figcaption>
    </figure>
  );
}

// Deux images, une par thème : la bonne s'affiche selon le thème choisi.
function Shot({ id, alt, cls }: { id: string; alt: string; cls: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/marketing/${id}-light.webp`} alt={alt} loading="lazy" decoding="async" className={`block h-auto w-full dark-hidden ${cls}`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/marketing/${id}-dark.webp`} alt="" aria-hidden loading="lazy" decoding="async" className={`hidden h-auto w-full dark-shown ${cls}`} />
    </>
  );
}
