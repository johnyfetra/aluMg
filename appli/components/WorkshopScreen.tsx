"use client";
import ProfileNeeds from "@/components/ProfileNeeds";
import { WorkshopView } from "@/components/Workshop";
import { useI18n } from "@/lib/i18n";
import { type Quote, type Settings, lineSchema } from "@/lib/model";
import { initSim, simulate } from "@/lib/procure";
import { href } from "../lib/route";

// Besoin en profilés (barres à acheter, chute), puis bon de commande et plan de coupe barre par barre.
export default function WorkshopScreen({ quote, settings }: { quote: Quote; settings: Settings }) {
  const { t } = useI18n();
  const lines = quote.lines.filter((l) => lineSchema.safeParse(l).success);
  const plan = simulate(lines, initSim(settings.market), settings.kerf);
  return (
    <div className="space-y-6">
      {/* feuille A4 : défile en largeur sur un téléphone plutôt que d'écraser les tableaux */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="min-w-[40rem]">
          <WorkshopView quote={{ ...quote, lines }} settings={settings} market={settings.market} backHref={href("devis", { id: quote.id })} />
        </div>
      </div>
      <ProfileNeeds lines={lines} plan={plan} t={t} suppliersHref={href("reglages")} />
    </div>
  );
}
