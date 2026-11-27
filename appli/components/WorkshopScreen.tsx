"use client";
import ProfileNeeds from "@/components/ProfileNeeds";
import { WorkshopView } from "@/components/Workshop";
import { useI18n } from "@/lib/i18n";
import { type Quote, type Settings, lineSchema } from "@/lib/model";
import { initSim, simulate } from "@/lib/procure";
import { href } from "../lib/route";
import ZoomBox from "./ZoomBox";

// Besoin en profilés (barres à acheter, chute), puis bon de commande et plan de coupe barre par barre.
export default function WorkshopScreen({ quote, settings }: { quote: Quote; settings: Settings }) {
  const { t } = useI18n();
  const lines = quote.lines.filter((l) => lineSchema.safeParse(l).success);
  const plan = simulate(lines, initSim(settings.market), settings.kerf);
  return (
    <div className="space-y-6">
      {/* feuille A4 ajustée à l'écran (zoom − / +), boutons hors du zoom */}
      <WorkshopView quote={{ ...quote, lines }} settings={settings} market={settings.market} backHref={href("devis", { id: quote.id })} wrapSheet={(sheet) => <ZoomBox>{sheet}</ZoomBox>} />
      <ProfileNeeds lines={lines} plan={plan} t={t} suppliersHref={href("reglages")} />
    </div>
  );
}
