import type { Metadata } from "next";
import MarketingHome from "@/components/marketing/MarketingHome";
export const metadata: Metadata = { title: "AluMg · Menuiserie aluminium, projets en confiance", description: "Découvrez les menuisiers, leurs réalisations et un espace commun pour vos devis, documents et échanges." };
export default function Landing() { return <MarketingHome />; }
