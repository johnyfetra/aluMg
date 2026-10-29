"use client";
import { MessageCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Thread from "./ChatThread";
import ConversationList from "./ConversationList";
import { useConversations } from "@/lib/client";
import { useI18n } from "@/lib/i18n";

// Messagerie : liste des conversations à gauche, fil à droite (un seul volet à la fois sur mobile).
export default function Messenger() {
  const { t } = useI18n();
  const router = useRouter();
  const selected = useSearchParams().get("c");
  const { data: convs = [], isLoading } = useConversations();
  const current = convs.find((c) => c.id === selected) ?? null;

  return (
    <div className="lg:space-y-4">
      <h1 className="hidden text-2xl font-bold lg:block">{t("msg.title")}</h1>
      {/* mobile : la liste prend tout l'écran sous la barre, et un fil ouvert passe en plein écran (comme WhatsApp) ; ordinateur : deux volets dans une carte */}
      <div className="-mx-4 -mb-20 -mt-6 grid h-[calc(100dvh-4rem)] overflow-hidden bg-surface sm:-mx-8 lg:mx-0 lg:mb-0 lg:mt-0 lg:h-[calc(100vh-11rem)] lg:min-h-[34rem] lg:grid-cols-[22rem_minmax(0,1fr)] lg:rounded-2xl lg:border lg:border-line lg:shadow-sm">
        <aside className={`min-h-0 flex-col border-line lg:border-r ${current ? "hidden lg:flex" : "flex"}`} aria-label={t("msg.conversations")}>
          <div className="hidden border-b border-line px-4 py-3 text-sm font-semibold lg:block">{t("msg.conversations")}</div>
          <ConversationList convs={convs} selected={selected} loading={isLoading} onSelect={(id) => router.replace(`/messages?c=${id}`)} />
        </aside>

        <section className={`min-h-0 min-w-0 flex-col ${current ? "flex max-lg:fixed max-lg:inset-0 max-lg:z-50 max-lg:h-dvh max-lg:bg-surface" : "hidden lg:flex"}`} aria-label={t("msg.thread")}>
          {current ? (
            <Thread key={current.id} conv={current} onBack={() => router.replace("/messages")} />
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center text-muted">
              <div>
                <MessageCircle size={40} aria-hidden className="mx-auto mb-3 opacity-40" />
                <p>{t("msg.pick")}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
