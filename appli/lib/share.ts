"use client";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import type { jsPDF } from "jspdf";

// Le WebView Android ne télécharge pas un PDF généré dans la page : on l'écrit dans le cache de l'application,
// puis la feuille de partage d'Android l'envoie (WhatsApp, e-mail, Drive, impression…). Dans un navigateur : téléchargement classique.
async function cacheFile(doc: jsPDF, name: string) {
  const data = doc.output("datauristring").split(",")[1];
  return (await Filesystem.writeFile({ path: name, data, directory: Directory.Cache })).uri;
}

export async function sharePdf(doc: jsPDF, name: string, title: string) {
  if (!Capacitor.isNativePlatform()) return doc.save(name);
  const uri = await cacheFile(doc, name);
  await Share.share({ title, files: [uri], dialogTitle: title });
}

// Envoi direct dans WhatsApp (pont natif AluMgShare, voir MainActivity) ; sans WhatsApp ni WhatsApp Business : feuille de partage.
export async function sharePdfWhatsApp(doc: jsPDF, name: string, title: string) {
  if (!Capacitor.isNativePlatform()) return doc.save(name);
  const uri = await cacheFile(doc, name);
  const native = (window as { AluMgShare?: { whatsapp: (uri: string, text: string) => boolean } }).AluMgShare;
  if (!native?.whatsapp(uri, title)) await Share.share({ title, files: [uri], dialogTitle: title });
}
