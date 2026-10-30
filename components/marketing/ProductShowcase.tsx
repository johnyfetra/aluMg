"use client";
import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";

// Vraies captures de l'application (données d'exemple), empilées en fenêtres inclinées : celle choisie passe devant, les autres restent en profondeur.
// À l'écran, la pile se redresse doucement quand on défile (voir .deck dans globals.css).
const IDS = ["pro-dashboard", "pro-quote", "client-quote", "client-mobile"] as const;

export default function ProductShowcase({ side = false }: { side?: boolean }) {
  const { locale } = useI18n();
  const c = marketing[locale];
  const [i, setI] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  // la pile suit la souris : légère rotation d'ensemble et décalage entre couches (variables --mx, --my entre -1 et 1)
  const follow = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = stage.current, r = el?.getBoundingClientRect();
    if (!el || !r) return;
    const mx = ((e.clientX - r.left) / r.width) * 2 - 1, my = ((e.clientY - r.top) / r.height) * 2 - 1;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => { el.style.setProperty("--mx", mx.toFixed(3)); el.style.setProperty("--my", my.toFixed(3)); });
  };
  const rest = () => { cancelAnimationFrame(raf.current); stage.current?.style.setProperty("--mx", "0"); stage.current?.style.setProperty("--my", "0"); };
  const names = [c.tab1, c.tab2, c.tab3, c.tab4];
  const caps = [c.cap1, c.cap2, c.cap3, c.cap4];
  return (
    <figure className={`grid min-w-0 items-center gap-6 ${side ? "md:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)] md:gap-6 lg:gap-10" : ""}`}>
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
      <div id="show-panel" role="tabpanel" aria-labelledby={`show-tab-${i}`} ref={stage} onPointerMove={follow} onPointerLeave={rest} className="stage min-w-0">
        <div className="tilt"><div className="deck relative mx-auto aspect-[3/2] w-[84%]">
          {IDS.map((id, n) => {
            const d = (n - i + IDS.length) % IDS.length; // 0 = devant
            return (
              <div key={id} className={`layer absolute inset-0 ${id === "client-mobile" ? "" : "overflow-hidden rounded-xl border border-line bg-surface transition-[border-color] will-change-transform shadow-[0_18px_36px_-20px_rgb(0_0_0/0.5)]"}`} style={{ "--d": d } as React.CSSProperties} data-back={d > 0 ? "" : undefined} data-phone={id === "client-mobile" ? "" : undefined}>
                {id === "client-mobile" ? (
                  <div className="pointer-events-none grid h-full place-items-center">
                    <Phone pick={d > 0 ? () => setI(n) : undefined} label={names[n]}><Shot id={id} alt={`${names[n]}. ${caps[n]}`} cls="" /></Phone>
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
                    {d > 0 && <button type="button" aria-label={names[n]} onClick={() => setI(n)} className="absolute inset-0 z-20 cursor-pointer" />}
                  </>
                )}
                {id !== "client-mobile" && <span aria-hidden className="shade pointer-events-none absolute inset-0 bg-surface" />}
              </div>
            );
          })}
        </div></div>
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

// iPhone récent : cadre titane fin, Dynamic Island, boutons latéraux. L'écran est la vraie capture (rapport 780 × 1688).
function Phone({ children, pick, label }: { children: React.ReactNode; pick?: () => void; label: string }) {
  return (
    <div className="pointer-events-auto relative h-[94%] aspect-[780/1688] max-w-[36%] rounded-[2.6rem] bg-gradient-to-br from-[#8d8a84] via-[#3b3a38] to-[#6f6c67] p-[3px] shadow-[0_24px_40px_-24px_rgb(0_0_0/0.55)]">
      <span aria-hidden className="absolute -left-[3px] top-[18%] h-[5%] w-[3px] rounded-l bg-[#55534f]" />
      <span aria-hidden className="absolute -left-[3px] top-[26%] h-[9%] w-[3px] rounded-l bg-[#55534f]" />
      <span aria-hidden className="absolute -right-[3px] top-[28%] h-[13%] w-[3px] rounded-r bg-[#55534f]" />
      <div className="relative h-full overflow-hidden rounded-[2.4rem] border-[5px] border-black bg-black">
        {children}
        {pick && <button type="button" aria-label={label} onClick={pick} className="absolute inset-0 z-20 cursor-pointer" />}
        <span aria-hidden className="absolute left-1/2 top-[1.6%] h-[2.6%] w-[28%] -translate-x-1/2 rounded-full bg-black" />
      </div>
    </div>
  );
}
