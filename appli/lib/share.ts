"use client";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import type { jsPDF } from "jspdf";

// Le WebView Android ne télécharge pas un PDF généré dans la page : on l'écrit dans le cache de l'application,
// puis la feuille de partage d'Android l'envoie (WhatsApp, e-mail, Drive, impression…). Dans un navigateur : téléchargement classique.
export async function sharePdf(doc: jsPDF, name: string, title: string) {
  if (!Capacitor.isNativePlatform()) return doc.save(name);
  const data = doc.output("datauristring").split(",")[1];
  const { uri } = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache });
  await Share.share({ title, files: [uri], dialogTitle: title });
}
