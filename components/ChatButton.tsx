"use client";
import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { openConversation } from "@/lib/client";
import { useI18n } from "@/lib/i18n";

// Ouvre (ou crée) la conversation puis y va ; l'API refuse si l'échange n'est pas permis.
export default function ChatButton({ target, label, className = "btn-secondary w-full", compact = false, short }: { target: { menuisier: string } | { menuisierId: string } | { client: string } | { user: string } | { support: true }; label: string; className?: string; compact?: boolean; short?: string }) {
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
      <button type="button" className={compact ? "btn-secondary !min-h-9 w-full !px-2.5" : className} onClick={go} disabled={busy} aria-label={compact ? label : undefined}>
        <MessageCircle size={16} aria-hidden />
        {compact ? short : label}
      </button>
      {err && (
        <p role="alert" className="text-sm font-medium text-danger">
          {t("common.error")}
        </p>
      )}
    </>
  );
}
