"use client";
import { Camera, RefreshCw, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { T } from "@/lib/i18n";

// Prendre une photo avec la caméra de l'appareil (getUserMedia). Étape 1 : cadrer et capturer ; étape 2 : garder ou reprendre.
export default function CameraDialog({ t, onCapture, onClose }: { t: T; onCapture: (file: File) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [shot, setShot] = useState<{ url: string; blob: Blob } | null>(null);
  const [error, setError] = useState("");
  const denied = useRef(t("msg.cameraDenied"));
  useEffect(() => {
    denied.current = t("msg.cameraDenied");
  });

  const stop = () => {
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
  };

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
    let alive = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 } }, audio: false })
      .then(async (st) => {
        if (!alive) return st.getTracks().forEach((tr) => tr.stop());
        stream.current = st;
        if (video.current) {
          video.current.srcObject = st;
          await video.current.play().catch(() => {});
        }
      })
      .catch(() => alive && setError(denied.current));
    return () => {
      alive = false;
      stop(); // pas de d.close() ici : l'événement « close » rappellerait onClose et démonterait la boîte (React rejoue les effets en développement)
    };
  }, [facing]);

  useEffect(() => () => { if (shot) URL.revokeObjectURL(shot.url); }, [shot]);

  const capture = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    c.toBlob((b) => b && setShot({ url: URL.createObjectURL(b), blob: b }), "image/jpeg", 0.9);
  };

  return (
    <dialog ref={dialog} aria-label={t("msg.cameraTitle")} onClose={onClose} className="m-auto w-[min(94vw,40rem)] overflow-hidden rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/70">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-semibold">{t("msg.cameraTitle")}</h2>
        <button type="button" onClick={onClose} aria-label={t("common.back")} className="grid size-9 place-items-center rounded-lg hover:bg-surface-2">
          <X size={18} aria-hidden />
        </button>
      </div>
      <div className="relative aspect-[4/3] bg-black">
        {shot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot.url} alt="" className="size-full object-contain" />
        ) : (
          <video ref={video} playsInline muted className="size-full object-contain" />
        )}
        {error && <p role="alert" className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white">{error}</p>}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 p-4">
        {shot ? (
          <>
            <button type="button" className="btn-secondary" onClick={() => setShot(null)}>
              <RotateCcw size={16} aria-hidden />
              {t("msg.retake")}
            </button>
            <button type="button" className="btn-primary" onClick={() => onCapture(new File([shot.blob], `photo-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.jpg`, { type: "image/jpeg" }))}>
              {t("msg.usePhoto")}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn-secondary" onClick={() => { setError(""); setFacing(facing === "environment" ? "user" : "environment"); }} aria-label={t("msg.switchCamera")} title={t("msg.switchCamera")}>
              <RefreshCw size={16} aria-hidden />
            </button>
            <button type="button" className="btn-primary" onClick={capture} disabled={!!error}>
              <Camera size={18} aria-hidden />
              {t("msg.capture")}
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}
