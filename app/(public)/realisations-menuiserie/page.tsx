import type { Metadata } from "next";
import { PublicProjects } from "@/components/marketing/Presentation";
export const metadata: Metadata = { title: "Réalisations des menuisiers — AluMg", description: "Explorez les photos publiées par les professionnels de la menuiserie aluminium et découvrez leurs portfolios." };
export default function ProjectsPage() { return <PublicProjects />; }
