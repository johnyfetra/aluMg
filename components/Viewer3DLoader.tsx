"use client";
import dynamic from "next/dynamic";
import type { Viewable } from "./Viewer3D";

// three.js est lourd : chargé seulement quand la vue 3D est affichée, et jamais côté serveur.
const Viewer3D = dynamic(() => import("./Viewer3D"), {
  ssr: false,
  loading: () => <div className="h-[380px] animate-pulse rounded-xl bg-surface-2" aria-hidden />,
});

export default function Viewer3DLoader(props: { line: Viewable; highlight?: string | null }) {
  return <Viewer3D {...props} />;
}
