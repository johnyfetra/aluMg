"use client";
import { useState } from "react";
import FallbackArt, { fallbackKind } from "../FallbackArt";
import { useI18n } from "@/lib/i18n";

/** Une photo manquante est remplacée par l'illustration AluMg étiquetée « photo à venir », jamais par une fausse réalisation. `category` : spécialité de la réalisation, pour choisir le dessin (fenêtre, porte, volet). */
export default function Photo({ src, alt, className = "", priority = false, position = "center", grade = false, category }: { category?: string; src?: string; alt: string; className?: string; priority?: boolean; position?: string; grade?: boolean }) {
  const { t } = useI18n();
  const [failed, setFailed] = useState<string | null>(null);
  return <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
    {src && failed !== src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async" onError={() => setFailed(src)} width={1536} height={1024} className={`h-full w-full object-cover ${grade ? "photo-grade" : ""}`} style={{ objectPosition: position }} />
      ) : <div role="img" aria-label={`${alt} — ${t("photo.soon")}`} className="h-full min-h-40"><FallbackArt kind={fallbackKind(category)} label={t("photo.soon")} /></div>}
  </div>;
}
