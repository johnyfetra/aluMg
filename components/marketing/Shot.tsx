"use client";
import { onImgError } from "@/lib/fallback";

// Capture de l'application (public/marketing/<id>-{light,dark}.webp) : une image par thème, seule celle du thème actif s'affiche.
export default function Shot({ id, alt, priority = false, className = "" }: { id: string; alt: string; priority?: boolean; className?: string }) {
  const load = priority ? { loading: "eager" as const, fetchPriority: "high" as const } : { loading: "lazy" as const };
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/marketing/${id}-light.webp`} onError={onImgError} alt={alt} {...load} decoding="async" className={`block h-auto w-full dark-hidden ${className}`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/marketing/${id}-dark.webp`} alt="" aria-hidden {...load} decoding="async" className={`hidden h-auto w-full dark-shown ${className}`} />
    </>
  );
}
