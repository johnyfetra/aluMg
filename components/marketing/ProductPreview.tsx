"use client";
import { Check, FileText, MessageSquare, Ruler } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";

export default function ProductPreview() {
  const { locale } = useI18n();
  const c = marketing[locale];
  return <figure className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_20px_70px_-35px_rgb(24_43_35/0.25)]">
    <figcaption className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 text-xs"><span className="font-semibold">AluMg <span className="ml-2 font-normal text-muted">/ {c.sampleDoc}</span></span><span className="text-muted">{c.sample}</span></figcaption>
    <div className="p-5 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">{c.sampleProject}</h3><p className="mt-1 text-xs text-muted">{c.sampleDetail}</p></div><span className="rounded-full bg-warn/10 px-3 py-1 text-xs font-medium text-warn">{c.sampleStatus}</span></div>
      <div className="my-6 rounded-xl bg-bg p-5 sm:p-8">
        <svg viewBox="0 0 460 240" role="img" aria-label={c.sampleProject} className="mx-auto w-full max-w-md">
          <defs><pattern id="preview-grid" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M18 0H0V18" fill="none" stroke="currentColor" strokeOpacity=".08" /></pattern></defs>
          <rect width="460" height="240" fill="url(#preview-grid)" />
          <g fill="none" stroke="currentColor" className="text-primary"><path d="M38 30h384v174H38z" strokeWidth="5"/><path d="M44 36h122v162H44zM170 36h122v162H170zM296 36h120v162H296z" strokeWidth="2"/><path d="m66 62 65 84m62-84 65 84m62-84 65 84" strokeOpacity=".15" strokeWidth="12"/><path d="M157 104v25m126-25v25" strokeWidth="3"/><path d="M38 219h384m-384-5v10m384-10v10" strokeOpacity=".6"/></g>
        </svg>
      </div>
      <p className="flex gap-2 text-sm leading-relaxed text-muted"><Ruler size={17} aria-hidden className="mt-0.5 shrink-0" />{c.sampleNote}</p>
      <div className="mt-6 grid grid-cols-3 gap-2 border-t border-line pt-5">{[[FileText,c.sampleDoc],[MessageSquare,c.sampleChat],[Check,c.sampleDecision]].map(([Icon,label]) => { const I = Icon as typeof Check; return <div key={String(label)} className="flex flex-col items-start gap-2 text-xs font-medium"><I size={17} aria-hidden className="text-primary" />{String(label)}</div>; })}</div>
    </div>
  </figure>;
}
