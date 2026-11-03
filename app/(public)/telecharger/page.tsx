import type { Metadata } from "next";
import AndroidDownload from "@/components/marketing/AndroidDownload";

export const metadata: Metadata = { title: "Application Android · AluMg", description: "Téléchargez l’application AluMg pour Android : vos devis, messages et notifications, compatible avec les anciens téléphones (Android 5.1 et plus)." };
export default function DownloadPage() { return <AndroidDownload />; }
