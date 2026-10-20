"use client";
import { useSearchParams } from "next/navigation";
import Viewer3D, { type Viewable } from "@/components/Viewer3D";
import { I18nProvider } from "@/lib/i18n";

// Ouvrage mis en scène (mur, sol, ciel) plein écran, piloté par l'adresse : ?cat=fenetre&op=coulissant&leaves=3&finish=anthracite…
export default function DemoRender() {
  const q = useSearchParams();
  const g = (k: string, d: string) => q.get(k) ?? d;
  const line = {
    category: g("cat", "fenetre"), opening: g("op", "coulissant"), leaves: Number(g("leaves", "2")), shutter: g("shutter", "roulant"), control: g("control", "manuel"),
    guard: g("guard", "verre"), infill: g("infill", "vitree"), finish: g("finish", "blanc"), glassType: g("glass", "clair"), pattern: g("pattern", "none"),
    range: g("range", "europeen"), extras: [] as never[], width: Number(g("w", "1800")), height: Number(g("h", "1200")),
  } as Viewable;
  return (
    <I18nProvider>
      <div style={{ position: "fixed", inset: 0 }}>
        <Viewer3D
          line={line}
          bare
          initialOpen={Number(g("open", "0"))}
          stage={{ wall: `#${g("wall", "e9e2d3")}`, ground: `#${g("ground", "b9b3a2")}`, sky: `#${g("sky", "cfe3f5")}`, interior: `#${g("interior", "d8c6a8")}`, sill: Number(g("sill", "0.9")) }}
          view={{ az: Number(g("az", "-24")), el: Number(g("el", "6")), dist: Number(g("dist", "1.15")) }}
        />
      </div>
    </I18nProvider>
  );
}
