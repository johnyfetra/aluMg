import type { Metadata } from "next";
import MarketingHome from "@/components/marketing/MarketingHome";

const title = "AluMg · Devis de menuiserie aluminium en quelques minutes";
const description = "Pour les menuisiers aluminium de Madagascar : devis et PDF professionnels, prix de revient et marge, plan de coupe, schéma 3D, envoi par WhatsApp. Séries K56 et T55, prix en Ariary, en français et en malgache.";
export const metadata: Metadata = { title, description, openGraph: { title, description, type: "website", locale: "fr_MG", siteName: "AluMg", images: [{ url: "/marketing/pro-quote-light.webp", width: 1500, height: 938, alt: "Un devis en cours dans l’application AluMg" }] } };
export default function Landing() { return <MarketingHome />; }
