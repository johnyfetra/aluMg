"use client";
import { Mail, MessageCircle } from "lucide-react";
import ChatButton from "../ChatButton";
import { useI18n } from "@/lib/i18n";
import { normalizePhone } from "@/lib/phone";
import type { Quote } from "@/lib/model";

// « Envoyer un message au client » depuis le devis. Client avec compte et devis envoyé : la messagerie AluMg. Sinon WhatsApp (le canal courant à Madagascar)
// ou e-mail, avec un message prêt à envoyer ; sans coordonnées, un rappel d'en ajouter.
export default function ClientMessage({ q, persisted }: { q: Quote; persisted: boolean }) {
  const { t } = useI18n();
  if (q.clientId && persisted) return <ChatButton target={{ client: q.clientId }} label={t("msg.clientWrite")} />;
  const name = q.client.name.trim();
  const text = `${t("msg.clientHello")} ${name}${persisted && q.number ? `, ${t("msg.clientAbout")} ${q.number}` : ""}${q.project ? ` (${q.project})` : ""}.`.replace(/\s+/g, " ");
  const phone = normalizePhone(q.client.phone);
  const email = q.client.email?.trim();
  if (!phone && !email) return <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">{t("msg.clientNone")}</p>;
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("msg.clientWrite")}>
      {phone && <a className="btn-secondary" href={`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} aria-hidden />{t("msg.clientWrite")} · WhatsApp</a>}
      {email && <a className="btn-secondary" href={`mailto:${email}?subject=${encodeURIComponent(q.number ? `${t("pdf.quote")} ${q.number}` : t("pdf.quote"))}&body=${encodeURIComponent(text)}`}><Mail size={16} aria-hidden />{t("msg.clientWrite")} · {t("msg.clientEmail")}</a>}
    </div>
  );
}
