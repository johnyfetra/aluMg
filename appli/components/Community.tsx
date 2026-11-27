"use client";
import { MessageCircle, ThumbsUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { SUPPORT_PHONE_DISPLAY, supportUrl } from "@/lib/support";

// Page Facebook d'AluMg (même lien que le site, réglé dans l'admin) : en dur, l'application marche hors ligne.
export const FACEBOOK_PAGE = "https://www.facebook.com/profile.php?id=61595904374968";

// Suivre AluMg et le contacter : la page Facebook et le support par WhatsApp (liens externes, ouverts hors de l'application).
export default function Community() {
  const { t } = useI18n();
  const row = "card flex items-center gap-3 !p-3.5 active:scale-[0.99]";
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <a href={FACEBOOK_PAGE} target="_blank" rel="noopener" className={row}>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#1877f2] text-white"><ThumbsUp size={18} aria-hidden /></span>
        <span className="min-w-0"><span className="block font-semibold">{t("app.facebook")}</span><span className="block text-xs text-muted">{t("app.facebookSub")}</span></span>
      </a>
      <a href={supportUrl(t("support.msg"))} target="_blank" rel="noopener" className={row}>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#25D366] text-white"><MessageCircle size={18} aria-hidden /></span>
        <span className="min-w-0"><span className="block font-semibold">{t("support.contact")}</span><span className="block text-xs text-muted">{t("support.via")} · {SUPPORT_PHONE_DISPLAY}</span></span>
      </a>
    </div>
  );
}
