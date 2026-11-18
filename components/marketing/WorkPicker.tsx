"use client";
import Link from "next/link";
import { AppWindow, ArrowRight, DoorOpen, Fence, Home, PanelsTopLeft, Store } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";
import Reveal from "./Reveal";

const PICKS = [["fenetres", AppWindow], ["portes", DoorOpen], ["veranda", Home], ["baies", PanelsTopLeft], ["garde-corps", Fence], ["vitrines", Store]] as const;
const TINTS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--critical)", "var(--info)"]; // une pastille de couleur vive par ouvrage

// Entrée directe : le client choisit son ouvrage et arrive sur les réalisations de cette catégorie.
export default function WorkPicker() {
  const { t, locale } = useI18n();
  return (
    <section className="public-container pb-10" aria-labelledby="pick-title">
      <h2 id="pick-title" className="mb-4 text-lg font-semibold sm:text-xl">{marketing[locale].pickTitle}</h2>
      <Reveal as="ul" stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {PICKS.map(([key, Icon], i) => (
          <li key={key}>
            <Link href={`/realisations-menuiserie?category=${key}`} className="group flex min-h-16 items-center gap-3 rounded-xl border border-line bg-surface px-4 text-sm font-medium transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl text-white transition-transform group-hover:scale-110" style={{ background: TINTS[i] }}><Icon size={20} strokeWidth={1.75} /></span>
              {t(`spec.${key}`)}
              <ArrowRight size={14} aria-hidden className="ml-auto shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </li>
        ))}
      </Reveal>
    </section>
  );
}
