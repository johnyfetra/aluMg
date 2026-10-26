"use client";
import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { openConversation } from "@/lib/client";
import { useI18n } from "@/lib/i18n";

// Ouvre (ou crée) la conversation puis y va ; l'API refuse si l'échange n'est pas permis.
export default function ChatButton({ target, label, className = "btn-secondary w-full" }: { target: { menuisier: string } | { menuisierId: string } | { client: string }; label: string; className?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const go = async () => {
    setBusy(true);
    setErr(false);
    try {
      router.push(`/messages?c=${await openConversation(target)}`);
    } catch {
      setErr(true);
      setBusy(false);
    }
  };
  return (
    <>
      <button type="button" className={className} onClick={go} disabled={busy}>
        <MessageCircle size={16} aria-hidden />
        {label}
      </button>
      {err && (
        <p role="alert" className="text-sm font-medium text-danger">
          {t("common.error")}
        </p>
      )}
    </>
  );
}
