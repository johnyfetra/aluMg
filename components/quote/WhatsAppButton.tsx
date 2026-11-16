"use client";
import SocialIcon from "../SocialIcon";
import { useShareQuote } from "./useShareQuote";
import { useI18n } from "@/lib/i18n";
import type { Quote } from "@/lib/model";

// Bouton « envoyer par WhatsApp » d'un devis enregistré : le même partout (liste, éditeur, aperçu). `compact` : icône seule, libellé en infobulle.
export default function WhatsAppButton({ q, compact = false, className = "" }: { q: Pick<Quote, "id" | "client" | "number">; compact?: boolean; className?: string }) {
  const { t } = useI18n();
  const { send, busy } = useShareQuote(q);
  const label = compact ? { "aria-label": `${t("share.send")} ${q.number}`, title: t("share.send") } : {};
  return (
    <button type="button" className={`btn-whatsapp ${className}`} onClick={send} disabled={busy} {...label}>
      <SocialIcon network="whatsapp" size={16} />
      {!compact && t("share.sendShort")}
    </button>
  );
}
