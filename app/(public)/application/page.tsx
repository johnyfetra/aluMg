import type { Metadata } from "next";
import { ApplicationPresentation } from "@/components/marketing/Presentation";
export const metadata: Metadata = { title: "L’application AluMg · Devis et collaboration", description: "Un espace commun pour les devis de menuiserie aluminium, les documents et les échanges entre client et professionnel." };
export default function ApplicationPage() { return <ApplicationPresentation />; }
