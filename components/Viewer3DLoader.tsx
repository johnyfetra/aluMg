"use client";
import dynamic from "next/dynamic";
import type { Stage, Viewable } from "./Viewer3D";

// three.js est lourd : chargé seulement quand la vue 3D est affichée, et jamais côté serveur.
const Viewer3D = dynamic(() => import("./Viewer3D"), {
  ssr: false,
  loading: () => <div className="h-[440px] animate-pulse rounded-xl bg-surface-2" aria-hidden />,
});

// Décor réel pour les fenêtres et les portes : crépi, appui, sol, jardin, ciel. L'ouvrage se juge comme posé sur un chantier, pas dans le vide.
const STAGE: Stage = { wall: "#d9c8b4", ground: "#a8a395", sky: "#bcd6ec", interior: "#5f4d39" };

export default function Viewer3DLoader(props: { line: Viewable; highlight?: string | null }) {
  const c = props.line.category;
  if (c !== "fenetre" && c !== "porte" && c !== "volet") return <Viewer3D {...props} />;
  const sill = c === "porte" || (c === "volet" && props.line.shutter === "rideau") ? 0 : 0.9; // porte et rideau métallique de plain-pied, fenêtre et volet roulant en allège
  return <Viewer3D {...props} stage={{ ...STAGE, sill }} dims />;
}
