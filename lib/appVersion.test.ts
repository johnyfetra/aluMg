import { describe, expect, it } from "vitest";
import { ANDROID_APP, installedAppVersion, updateAvailable } from "./appVersion";

const wv = "Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0 Mobile Safari/537.36";
const chrome = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";

describe("version de l'application Android installée", () => {
  it("lit le marqueur de la coque, ou prend la version 1 pour un WebView sans marqueur", () => {
    expect(installedAppVersion(`${wv} AluMgApp/2`)).toBe(2);
    expect(installedAppVersion(wv)).toBe(1);
  });
  it("ne concerne pas le navigateur ordinaire", () => {
    expect(installedAppVersion(chrome)).toBeNull();
    expect(updateAvailable(chrome)).toBe(false);
  });
  it("propose la mise à jour seulement quand une version plus récente existe", () => {
    expect(updateAvailable(wv)).toBe(true);
    expect(updateAvailable(`${wv} AluMgApp/${ANDROID_APP.versionCode}`)).toBe(false);
    expect(updateAvailable(`${wv} AluMgApp/${ANDROID_APP.versionCode + 1}`)).toBe(false);
  });
});
