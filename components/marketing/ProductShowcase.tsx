"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";

// Vraies captures de l'application (données d'exemple), empilées en fenêtres inclinées : celle choisie passe devant, les autres restent en profondeur.
// À l'écran, la pile se redresse doucement quand on défile (voir .deck dans globals.css).
const IDS = ["pro-dashboard", "pro-quote", "client-quote", "client-mobile"] as const;

export default function ProductShowcase({ side = false }: { side?: boolean }) {
  const { locale } = useI18n();
  const c = marketing[locale];
  const [i, setI] = useState(0);
  const names = [c.tab1, c.tab2, c.tab3, c.tab4];
  const caps = [c.cap1, c.cap2, c.cap3, c.cap4];
  return (
    <figure className={`grid min-w-0 items-center gap-6 ${side ? "lg:grid-cols-[minmax(0,.62fr)_minmax(0,1.38fr)] lg:gap-10" : ""}`}>
      <div className="min-w-0">
        <div role="tablist" aria-label={c.showTitle} aria-orientation="vertical" className="space-y-1">
          {names.map((name, n) => (
            <button key={n} type="button" role="tab" id={`show-tab-${n}`} aria-selected={n === i} aria-controls="show-panel" onClick={() => setI(n)} className={`group block w-full border-l-2 py-2 pl-4 pr-2 text-left transition-colors ${n === i ? "border-accent" : "border-line hover:border-muted"}`}>
              <span className={`flex items-baseline gap-3 text-base font-medium ${n === i ? "text-ink" : "text-muted group-hover:text-ink"}`}><span className="font-mono text-xs text-muted">0{n + 1}</span>{name}</span>
              {n === i && <span className="show-in mt-1 block text-sm leading-6 text-muted">{caps[n]}</span>}
            </button>
          ))}
        </div>
        <p className="mt-4 pl-4 text-xs text-muted">{c.showNote}</p>
      </div>
      <div id="show-panel" role="tabpanel" aria-labelledby={`show-tab-${i}`} className="stage min-w-0">
        <div className="deck relative mx-auto aspect-[3/2] w-[84%]">
          {IDS.map((id, n) => {
            const d = (n - i + IDS.length) % IDS.length; // 0 = devant
            return (
              <div key={id} className="layer absolute inset-0 overflow-hidden rounded-xl border border-line bg-surface shadow-[0_30px_60px_-30px_rgb(0_0_0/0.55)]" style={{ "--d": d } as React.CSSProperties} aria-hidden={d > 0} onClick={d > 0 ? () => setI(n) : undefined}>
                {id === "client-mobile" ? (
                  <div className="grid h-full place-items-center bg-surface-2 pt-[6%]">
                    <div className="h-full w-[34%] self-end rounded-t-[1.6rem] border-[6px] border-b-0 border-ink/85 bg-ink/85"><Shot id={id} alt={`${names[n]}. ${caps[n]}`} cls="rounded-t-[1.2rem]" /></div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 border-b border-line bg-surface px-3 py-2" aria-hidden>
                      <span className="group/dots flex gap-1.5">
                        {[["#ff5f57", "M2 2l6 6M8 2L2 8"], ["#febc2e", "M2 5h6"], ["#28c840", "M5 2v6M2 5h6"]].map(([color, glyph]) => (
                          <span key={color} className="grid size-2.5 place-items-center rounded-full shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.18)] sm:size-3" style={{ background: color }}>
                            <svg viewBox="0 0 10 10" className="size-2 opacity-0 transition-opacity group-hover/dots:opacity-60" fill="none" stroke="#3a1c1a" strokeWidth="1.4" strokeLinecap="round"><path d={glyph} /></svg>
                          </span>
                        ))}
                      </span>
                      <span className="ml-2 truncate rounded-md bg-surface-2 px-3 py-0.5 text-[10px] text-muted sm:text-[11px]">app.alumg.mg</span>
                    </div>
                    <Shot id={id} alt={`${names[n]}. ${caps[n]}`} cls="" />
                  </>
                )}
                <span aria-hidden className="shade pointer-events-none absolute inset-0 bg-surface" />
              </div>
            );
          })}
        </div>
      </div>
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
