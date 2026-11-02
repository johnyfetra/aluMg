"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

// Comparateur avant/après : un curseur natif (clavier et tactile gratuits) pilote le découpage de la photo « après ».
export default function BeforeAfter({ before, after, alt, className = "" }: { before: string; after: string; alt: string; className?: string }) {
  const { t } = useI18n();
  const [pos, setPos] = useState(50);
  return (
    <div className={`relative select-none overflow-hidden bg-surface-2 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={before} alt={`${alt} — ${t("mp.before")}`} className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={`${alt} — ${t("mp.after")}`} className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 0 0 ${pos}%)` }} loading="lazy" decoding="async" />
      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">{t("mp.before")}</span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">{t("mp.after")}</span>
      <span aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }}>
        <span className="absolute left-1/2 top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-xs font-bold text-black shadow-md">↔</span>
      </span>
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label={t("mp.compare")} className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
    </div>
  );
}
