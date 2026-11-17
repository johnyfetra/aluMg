"use client";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";
import SocialIcon from "../SocialIcon";
import Reveal from "./Reveal";

// Le trajet réel d'un devis partagé : message envoyé, page publique /d/<code>, réponse du client.
// Les textes des maquettes sont ceux que l'application envoie et affiche vraiment (clés share.* et msg.*), pour ne rien promettre d'autre.
export default function WhatsAppFlow() {
  const { locale, t } = useI18n();
  const c = marketing[locale];
  const steps = [c.waStep1, c.waStep2, c.waStep3];
  const mocks = [
    <p key="send" className="ml-auto max-w-[90%] rounded-2xl rounded-br-sm bg-mine px-4 py-3 text-sm leading-6 text-on-mine">{t("msg.clientHello")} {c.waClient}, {t("share.msg")} <span className="break-all underline decoration-on-mine/40">{c.waLink}</span></p>,
    <div key="page" className="rounded-xl border border-line bg-surface p-4 text-sm shadow-(--shadow-card)">
      <p className="text-xs text-muted">{t("share.from")}</p><p className="font-semibold">{c.waFrom}</p>
      <p className="mt-3 flex items-baseline justify-between border-t border-line pt-3"><span className="text-muted">{c.waTotal}</span><span className="font-mono text-xs text-muted">Ar</span></p>
      <div className="mt-4 grid gap-2"><span className="btn-whatsapp-solid pointer-events-none justify-center"><SocialIcon network="whatsapp" size={15} />{t("share.accept")}</span><span className="btn-secondary pointer-events-none justify-center">{t("share.question")}</span></div>
    </div>,
    <p key="reply" className="max-w-[90%] rounded-2xl rounded-bl-sm bg-surface px-4 py-3 text-sm leading-6 ring-1 ring-line">{t("share.acceptMsg")}</p>,
  ];
  return (
    <section className="cv border-t border-line bg-surface" aria-labelledby="wa-title">
      <div className="public-container py-20 sm:py-28">
        <Reveal className="max-w-2xl"><p className="eyebrow">{c.waEyebrow}</p><h2 id="wa-title" className="mt-4 text-3xl font-medium sm:text-4xl">{c.waTitle}</h2><p className="mt-4 leading-7 text-muted">{c.waIntro}</p></Reveal>
        <Reveal as="ol" stagger className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((title, i) => (
            <li key={title} className="flex flex-col gap-5 rounded-2xl border border-line bg-bg p-5">
              <h3 className="flex items-baseline gap-3 font-semibold"><span className="font-mono text-xs text-accent">0{i + 1}</span>{title}</h3>
              <div aria-hidden className="chat-bg flex flex-1 items-end rounded-xl p-3">{mocks[i]}</div>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
