"use client";
import { Maximize2, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

const PAGE = 640; // largeur de la feuille (px), comme à l'impression

// Feuille A4 (devis, bon de commande, plan de coupe) ajustée à la largeur du téléphone au départ, puis − / + au doigt.
export default function ZoomBox({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  const [zoom, setZoom] = useState<number | null>(null); // null : ajusté à l'écran
  useEffect(() => {
    const measure = () => box.current && setFit(Math.min(1, box.current.clientWidth / PAGE));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const z = zoom ?? fit;
  const step = (d: number) => setZoom(Math.min(3, Math.max(0.3, Math.round((z + d) * 100) / 100)));
  return (
    <>
      <div className="sticky top-[calc(var(--head,3.4rem)+env(safe-area-inset-top))] z-10 flex items-center justify-end gap-1.5 print:hidden">
        <button type="button" className="btn-secondary !min-h-10 !px-2.5" onClick={() => step(-0.25)} aria-label={t("app.zoomOut")} title={t("app.zoomOut")}>
          <Minus size={18} aria-hidden />
        </button>
        <span className="w-12 text-center text-sm font-semibold tabular-nums" aria-live="polite">{Math.round(z * 100)} %</span>
        <button type="button" className="btn-secondary !min-h-10 !px-2.5" onClick={() => step(0.25)} aria-label={t("app.zoomIn")} title={t("app.zoomIn")}>
          <Plus size={18} aria-hidden />
        </button>
        <button type="button" className="btn-secondary !min-h-10 !px-2.5" onClick={() => setZoom(null)} aria-label={t("app.zoomFit")} title={t("app.zoomFit")}>
          <Maximize2 size={18} aria-hidden />
        </button>
      </div>
      <div ref={box} className="overflow-auto">
        <div style={{ width: PAGE, zoom: z }} className="print:!w-auto print:![zoom:1]">
          {children}
        </div>
      </div>
    </>
  );
}
