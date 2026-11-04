import { Globe, MessageCircle, Music2 } from "lucide-react";
import type { SocialNetwork } from "@/lib/model";

// Icônes des réseaux : la bibliothèque d'icônes n'a pas les logos de marques, on dessine des glyphes simples reconnaissables.
export default function SocialIcon({ network, size = 18 }: { network: SocialNetwork | string; size?: number }) {
  const svg = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (network) {
    case "facebook":
      return <svg {...svg}><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8.5A.5.5 0 0 1 14 8Z" /></svg>;
    case "instagram":
      return <svg {...svg}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r=".6" fill="currentColor" /></svg>;
    case "youtube":
      return <svg {...svg}><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="m10 9.5 5 2.5-5 2.5Z" fill="currentColor" /></svg>;
    case "linkedin":
      return <svg {...svg}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 10v6M8 7.5v.01M12 16v-6m0 3a3 3 0 0 1 6 0v3" /></svg>;
    case "x":
      return <svg {...svg}><path d="m4 4 16 16M20 4 4 20" /></svg>;
    case "tiktok":
      return <Music2 size={size} aria-hidden />;
    case "whatsapp":
      return <MessageCircle size={size} aria-hidden />;
    default:
      return <Globe size={size} aria-hidden />;
  }
}
