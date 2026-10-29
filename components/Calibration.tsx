"use client";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { calibration } from "@/lib/costing";
import type { T } from "@/lib/i18n";
import type { Settings } from "@/lib/model";

// Prévient le menuisier quand ses prix sont encore ceux d'exemple ou périmés : un devis chiffré ainsi peut vendre à perte.
export default function Calibration({ settings, t }: { settings: Settings; t: T }) {
  const issues = calibration(settings);
  if (!issues.length) return null;
  const suppliers = issues.includes("market") || issues.includes("stale");
  const other = issues.includes("tariffs") || issues.includes("labor");
  return (
    <section role="note" aria-labelledby="h-calib" className="card space-y-2 border-warn/40 !p-3.5">
      <h3 id="h-calib" className="flex items-center gap-2 text-sm font-semibold text-warn">
        <TriangleAlert size={16} aria-hidden />
        {t("calib.title")}
      </h3>
      <ul className="list-disc space-y-0.5 pl-5 text-[13px] text-muted">
        {issues.map((i) => <li key={i}>{t(`calib.${i}`)}</li>)}
      </ul>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-semibold">
        {suppliers && <Link href="/fournisseurs" className="text-primary hover:underline">{t("calib.fix")}</Link>}
        {other && <Link href="/reglages" className="text-primary hover:underline">{t("calib.fixSettings")}</Link>}
      </div>
    </section>
  );
}
