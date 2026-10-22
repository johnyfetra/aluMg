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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("msg.title")}</h1>
      <div className="grid h-[calc(100vh-11rem)] min-h-[34rem] overflow-hidden rounded-2xl border border-line bg-surface shadow-sm lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className={`min-h-0 flex-col border-r border-line ${current ? "hidden lg:flex" : "flex"}`} aria-label={t("msg.conversations")}>
          <div className="border-b border-line px-4 py-3 text-sm font-semibold">{t("msg.conversations")}</div>
          <ConversationList convs={convs} selected={selected} loading={isLoading} onSelect={(id) => router.replace(`/messages?c=${id}`)} />
        </aside>

        <section className={`min-h-0 min-w-0 flex-col ${current ? "flex" : "hidden lg:flex"}`} aria-label={t("msg.thread")}>
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
