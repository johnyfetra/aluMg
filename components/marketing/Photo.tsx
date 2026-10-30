"use client";
import { ImageOff } from "lucide-react";
import { useState } from "react";

/** Les photos manquantes ne sont jamais remplacées par une fausse réalisation. */
export default function Photo({ src, alt, className = "", priority = false, position = "center" }: { src?: string; alt: string; className?: string; priority?: boolean; position?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  return <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
    {src && failed !== src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async" onError={() => setFailed(src)} width={1536} height={1024} className="h-full w-full object-cover" style={{ objectPosition: position }} />
    ) : <div role="img" aria-label={alt} className="flex h-full min-h-40 items-center justify-center text-muted"><ImageOff size={28} aria-hidden /></div>}
  </div>;
}
