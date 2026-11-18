import type { Metadata } from "next";
import MarketingHome from "@/components/marketing/MarketingHome";
export const metadata: Metadata = { title: "AluMg · Trouvez votre menuisier aluminium à Madagascar", description: "Fenêtres, portes et baies en aluminium : voyez les réalisations des menuisiers près de chez vous et recevez un devis détaillé ouvrage par ouvrage, avec schéma et prix." };
export default function Landing() { return <MarketingHome />; }
