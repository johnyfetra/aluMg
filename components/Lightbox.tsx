"use client";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef } from "react";

// Visionneuse d'images : <dialog> natif (focus piégé, Échap ferme), flèches pour naviguer.
export default function Lightbox({ images, index, onIndex, onClose, label }: { images: string[]; index: number; onIndex: (i: number) => void; onClose: () => void; label: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  const go = (delta: number) => onIndex((index + delta + images.length) % images.length);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      className="m-auto max-h-[92vh] max-w-[min(96vw,1200px)] overflow-hidden rounded-2xl bg-black/90 p-0 text-white backdrop:bg-black/70"
    >
      <div className="relative flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[index]} alt="" className="max-h-[88vh] w-auto max-w-full object-contain" />
        <button type="button" onClick={onClose} aria-label="×" className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-black/60 hover:bg-black/80">
          <X size={20} aria-hidden />
        </button>
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="←" className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 hover:bg-black/80">
              <ChevronLeft size={22} aria-hidden />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="→" className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 hover:bg-black/80">
              <ChevronRight size={22} aria-hidden />
            </button>
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs">
              {index + 1} / {images.length}
            </p>
          </>
        )}
      </div>
    </dialog>
  );
}
