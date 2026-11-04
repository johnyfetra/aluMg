"use client";
import { Download, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { ANDROID_APP, installedAppVersion, updateAvailable } from "@/lib/appVersion";
import { useI18n } from "@/lib/i18n";

// Dans l'application Android uniquement : propose la nouvelle version quand l'APK installé est plus ancien que celui du site.
// Le site se met à jour tout seul ; seule la coque Android demande un téléchargement. « Plus tard » n'est retenu que pour cette version.
const KEY = `alumg.update.${ANDROID_APP.versionCode}`;
const noop = () => () => {};
const seen = () => {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
};

export default function AppUpdate() {
  const { t } = useI18n();
  const show = useSyncExternalStore(noop, () => updateAvailable(navigator.userAgent) && !seen(), () => false);
  // la 1.0.0 ne sait pas lancer un téléchargement depuis la page : elle doit passer par le navigateur
  const legacy = useSyncExternalStore(noop, () => installedAppVersion(navigator.userAgent) === 1, () => false);
  const [copied, setCopied] = useState(false);
  const [hidden, setHidden] = useState(false);
  if (!show || hidden) return null;
  const later = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setHidden(true);
  };
  return (
    <div role="alertdialog" aria-label={t("app.update.title")} className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-2xl border border-line bg-surface p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/12 text-primary"><Download size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t("app.update.title")} · {ANDROID_APP.versionName}</p>
          <p className="mt-0.5 text-sm text-muted">{t(legacy ? "app.update.legacy" : "app.update.body")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {legacy ? (
              <button type="button" className="btn-primary !min-h-10" onClick={() => navigator.clipboard?.writeText(`${location.origin}/telecharger`).then(() => setCopied(true), () => {})}>
                {copied ? t("app.update.copied") : t("app.update.copy")}
              </button>
            ) : (
              <a href="/downloads/AluMg.apk" download className="btn-primary !min-h-10">{t("app.update.download")}</a>
            )}
            <button type="button" className="btn-secondary !min-h-10" onClick={later}>{t("app.update.later")}</button>
          </div>
        </div>
        <button type="button" onClick={later} aria-label={t("app.update.later")} className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2"><X size={16} aria-hidden /></button>
      </div>
    </div>
  );
}
