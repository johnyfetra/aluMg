"use client";
import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

// Partage : feuille native du téléphone si elle existe, sinon WhatsApp ; copie du lien en dernier recours.
export default function ShareButton({ title, path, className = "btn-secondary" }: { title: string; path: string; className?: string }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  const share = async () => {
    const url = new URL(path, window.location.origin).toString();
    try {
      if (navigator.share) return await navigator.share({ title, url });
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      // partage annulé par la personne : rien à faire
    }
  };
  return (
    <span className="inline-flex flex-wrap gap-2">
      <button type="button" className={className} onClick={share}>
        {done ? <Check size={16} aria-hidden /> : <Share2 size={16} aria-hidden />}
        {done ? t("mp.copied") : t("mp.share")}
      </button>
      <a className={className} target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`${title} ${typeof window === "undefined" ? "" : new URL(path, window.location.origin)}`)}`} aria-label={`WhatsApp — ${title}`}>
        WhatsApp
      </a>
    </span>
  );
}
