"use client";
import { WifiOff } from "lucide-react";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useOnline, warmOffline } from "@/lib/offline";

// Espace professionnel : installe le travail hors connexion (production seulement, le cache gênerait le rechargement à chaud) et signale l'absence de réseau.
export default function OfflineSupport() {
  const { t } = useI18n();
  const online = useOnline();
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then(() => warmOffline())
      .catch(() => {});
  }, []);
  if (online) return null;
  return (
    <p role="status" className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-warn/40 bg-warn/10 px-4 py-2 text-center text-sm font-medium text-warn">
      <WifiOff size={16} aria-hidden />
      {t("offline.banner")}
    </p>
  );
}
