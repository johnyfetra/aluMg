// Dernière version de l'application Android (coque Capacitor, voir mobile/README.md). À mettre à jour avec mobile/android/app/build.gradle à chaque nouvel APK.
export const ANDROID_APP = { versionCode: 3, versionName: "1.2.0", size: "3,1 Mo" } as const;

// Version installée, lue dans l'identifiant du navigateur : la coque 1.1.0 et suivantes ajoutent « AluMgApp/<code> » (capacitor.config.json) ;
// la 1.0.0 n'en ajoute pas : un WebView Android sans ce marqueur est donc la version 1. Hors application (navigateur ordinaire) : null.
export function installedAppVersion(ua: string): number | null {
  const m = /AluMgApp\/(\d+)/.exec(ua);
  if (m) return Number(m[1]);
  return /Android.*; wv\)/.test(ua) ? 1 : null;
}

export const updateAvailable = (ua: string) => {
  const v = installedAppVersion(ua);
  return v !== null && v < ANDROID_APP.versionCode;
};
