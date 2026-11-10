"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Une page vue du site public par navigation (sendBeacon : ne retarde ni la page ni la sortie). Rien n'est rendu.
export default function VisitBeacon() {
  const path = usePathname();
  useEffect(() => {
    try {
      navigator.sendBeacon?.("/api/track", new Blob([JSON.stringify({ path })], { type: "application/json" }));
    } catch { /* mesure facultative */ }
  }, [path]);
  return null;
}
