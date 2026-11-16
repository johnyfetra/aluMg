"use client";
import { useState } from "react";
import { useToast } from "../Toast";
import { request } from "@/lib/client";
import { errorText } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import type { Quote } from "@/lib/model";
import { normalizePhone } from "@/lib/phone";

// Lien public du devis (/d/<code>) : envoi par WhatsApp vers le numéro du client s'il est connu, copie, retrait.
export function useShareQuote(q: Pick<Quote, "id" | "client">) {
  const { t } = useI18n();
  const toast = useToast();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

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
  return { url, busy, send, copy, stop };
}
