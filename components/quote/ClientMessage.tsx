"use client";
import { Mail } from "lucide-react";
import ChatButton from "../ChatButton";
import { useI18n } from "@/lib/i18n";
import type { Quote } from "@/lib/model";

// « Envoyer un message au client » depuis le devis. Client avec compte et devis envoyé : la messagerie AluMg. Sinon l'e-mail, avec un message prêt à envoyer
// (WhatsApp passe par ShareQuote, qui joint le lien du devis).
export default function ClientMessage({ q, persisted }: { q: Quote; persisted: boolean }) {
  const { t } = useI18n();
  if (q.clientId && persisted) return <ChatButton target={{ client: q.clientId }} label={t("msg.clientWrite")} />;
  const name = q.client.name.trim();
  const text = `${t("msg.clientHello")} ${name}${persisted && q.number ? `, ${t("msg.clientAbout")} ${q.number}` : ""}${q.project ? ` (${q.project})` : ""}.`.replace(/\s+/g, " ");
  const email = q.client.email?.trim();
  if (!email) return null;
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("msg.clientWrite")}>
      {<a className="btn-secondary" href={`mailto:${email}?subject=${encodeURIComponent(q.number ? `${t("pdf.quote")} ${q.number}` : t("pdf.quote"))}&body=${encodeURIComponent(text)}`}><Mail size={16} aria-hidden />{t("msg.clientWrite")} · {t("msg.clientEmail")}</a>}
    </div>
  );
}
