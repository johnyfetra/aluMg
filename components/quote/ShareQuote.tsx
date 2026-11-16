"use client";
import { Copy, Link2Off } from "lucide-react";
import SocialIcon from "../SocialIcon";
import { useShareQuote } from "./useShareQuote";
import { useI18n } from "@/lib/i18n";
import type { Quote } from "@/lib/model";

// Panneau d'envoi de l'éditeur : WhatsApp, explication pour le menuisier, copie et retrait du lien.
export default function ShareQuote({ q, persisted }: { q: Quote; persisted: boolean }) {
  const { t } = useI18n();
  const { url, busy, send, copy, stop } = useShareQuote(q);
  if (!persisted) return <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">{t("share.saveFirst")}</p>;
  return (
    <div className="space-y-2">
      <button type="button" className="btn-whatsapp-solid w-full" onClick={send} disabled={busy}><SocialIcon network="whatsapp" size={16} />{t("share.send")}</button>
      <p className="text-xs text-muted">{t("share.hint")}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost !min-h-9 text-[13px]" onClick={copy}><Copy size={16} aria-hidden />{t("share.copy")}</button>
        {url && <button type="button" className="btn-ghost !min-h-9 text-[13px]" onClick={stop}><Link2Off size={16} aria-hidden />{t("share.stop")}</button>}
      </div>
    </div>
  );
}
