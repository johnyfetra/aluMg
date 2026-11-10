"use client";
import Link from "next/link";
import { Building2, Calculator, Images, LayoutTemplate, ScrollText, Store, type LucideIcon } from "lucide-react";
import type { T } from "@/lib/i18n";
import type { Messages } from "@/lib/messages/fr";

export type SectionTab = { href: string; label: string; Icon: LucideIcon; active: boolean };

// Onglets d'une rubrique de configuration : chaque onglet est un lien (adresse partageable, bouton retour du navigateur).
export default function SectionTabs({ label, tabs }: { label: string; tabs: SectionTab[] }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1 rounded-2xl border border-line bg-surface p-1">
      {tabs.map(({ href, label, Icon, active }) => (
        <Link
          key={href}
          href={href}
          scroll={false}
          aria-current={active ? "page" : undefined}
          className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold sm:flex-none ${active ? "bg-primary text-on-primary shadow-sm" : "text-muted hover:bg-surface-2 hover:text-ink"}`}
        >
          <Icon size={16} aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}

// Rubrique « Mon entreprise » : coordonnées, chiffrage et conditions (une seule page de réglages), puis le modèle de devis.
export const COMPANY_TABS = ["entreprise", "chiffrage", "conditions", "modele"] as const;
export type CompanyTab = (typeof COMPANY_TABS)[number];

export function CompanyTabs({ current, t }: { current: CompanyTab; t: T }) {
  const tabs: [CompanyTab, string, keyof Messages, LucideIcon][] = [
    ["entreprise", "/reglages", "cfg.tab.company", Building2],
    ["chiffrage", "/reglages?onglet=chiffrage", "cfg.tab.pricing", Calculator],
    ["conditions", "/reglages?onglet=conditions", "cfg.tab.terms", ScrollText],
    ["modele", "/modele-devis", "nav.docDesign", LayoutTemplate],
  ];
  return <SectionTabs label={t("cfg.company")} tabs={tabs.map(([id, href, key, Icon]) => ({ href, label: t(key), Icon, active: id === current }))} />;
}

// Rubrique « Vitrine » : ce que voient les clients (profil public et réalisations).
export function ShowcaseTabs({ current, t }: { current: "profil" | "realisations"; t: T }) {
  return (
    <SectionTabs
      label={t("cfg.showcase")}
      tabs={[
        { href: "/profil-public", label: t("nav.publicProfile"), Icon: Store, active: current === "profil" },
        { href: "/realisations", label: t("nav.portfolio"), Icon: Images, active: current === "realisations" },
      ]}
    />
  );
}
