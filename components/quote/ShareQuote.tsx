"use client";
import { Copy, Link2Off, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "../Toast";
import { request } from "@/lib/client";
import { errorText } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import type { Quote } from "@/lib/model";
import { normalizePhone } from "@/lib/phone";

// « Envoyer le devis par WhatsApp » : crée le lien public du devis (/d/<code>) et ouvre WhatsApp avec le message prêt, vers le numéro du client s'il est connu.
export default function ShareQuote({ q, persisted }: { q: Quote; persisted: boolean }) {
  const { t } = useI18n();
  const toast = useToast();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  if (!persisted) return <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">{t("share.saveFirst")}</p>;

  const link = async () => {
    if (url) return url;
    const { token } = await request<{ token: string }>("POST", `/api/quotes/${q.id}/share`);
    const u = new URL(`/d/${token}`, location.origin).toString();
    setUrl(u);
    return u;
  };
  const send = async () => {
    // fenêtre ouverte dès le clic : ouverte après l'attente réseau, le navigateur la bloquerait
    const w = window.open("about:blank", "_blank");
    setBusy(true);
    try {
      const u = await link();
      const phone = (normalizePhone(q.client.phone) ?? "").replace(/\D/g, "");
      const text = `${t("msg.clientHello")} ${q.client.name.trim()}, ${t("share.msg")} ${u}`.replace(/\s+/g, " ");
      const wa = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
      if (w) w.location.href = wa;
      else location.href = wa;
    } catch (e) {
      w?.close();
      toast.error(errorText(e, t));
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(await link());
      toast.success(t("mp.copied"));
    } catch (e) {
      toast.error(errorText(e, t));
    }
  };
  const stop = async () => {
    try {
      await request("DELETE", `/api/quotes/${q.id}/share`);
      setUrl("");
      toast.success(t("share.stopped"));
    } catch (e) {
      toast.error(errorText(e, t));
    }
  };
  return (
    <div className="space-y-2">
      <button type="button" className="btn-primary !min-h-12 w-full text-base" onClick={send} disabled={busy}><MessageCircle size={20} aria-hidden />{t("share.send")}</button>
      <p className="text-sm text-muted">{t("share.hint")}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" onClick={copy}><Copy size={16} aria-hidden />{t("share.copy")}</button>
        {url && <button type="button" className="btn-ghost" onClick={stop}><Link2Off size={16} aria-hidden />{t("share.stop")}</button>}
      </div>
    </div>
  );
}
