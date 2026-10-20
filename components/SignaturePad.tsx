"use client";
import { useRef } from "react";
import { useI18n } from "@/lib/i18n";

export default function SignaturePad({ onSave }: { onSave: (dataUrl: string) => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * ref.current!.width) / r.width, y: ((e.clientY - r.top) * ref.current!.height) / r.height };
  };
  const ctx = () => {
    const c = ref.current!.getContext("2d")!;
    c.lineWidth = 3;
    c.lineCap = "round";
    c.strokeStyle = "#0b1f6b";
    return c;
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={ref}
        width={600}
        height={240}
        className="w-full max-w-md touch-none rounded border border-dashed border-gray-400 bg-white"
        onPointerDown={(e) => {
          drawing.current = true;
          ref.current!.setPointerCapture(e.pointerId);
          const p = pos(e);
          const c = ctx();
          c.beginPath();
          c.moveTo(p.x, p.y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const p = pos(e);
          const c = ctx();
          c.lineTo(p.x, p.y);
          c.stroke();
        }}
        onPointerUp={() => (drawing.current = false)}
      />
      <div className="flex gap-2">
        <button type="button" className="btn-secondary" onClick={() => ref.current!.getContext("2d")!.clearRect(0, 0, 600, 240)}>
          {t("settings.clear")}
        </button>
        <button type="button" className="btn-primary" onClick={() => onSave(ref.current!.toDataURL("image/png"))}>
          {t("common.save")}
        </button>
      </div>
    </div>
  );
}
