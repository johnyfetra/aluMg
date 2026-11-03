"use client";
import { ArrowUpRight, BadgePercent, BookOpen, Boxes, Building2, FilePlus2, ImagePlus, LayoutTemplate, LifeBuoy, MessageCircle, PlayCircle, Send, Store, Scale, UserRound } from "lucide-react";
import Link from "next/link";
import { startGuide } from "@/components/GuideTour";
import { useI18n } from "@/lib/i18n";
import type { Messages } from "@/lib/messages/fr";

// Guide détaillé : une carte par fonctionnalité (textes gd.fN.*, points clés séparés par « | »). Le bouton lance la visite guidée sur les vrais écrans.
const FEATURES = [
  { Icon: Building2, href: "/reglages" },
  { Icon: BadgePercent },
  { Icon: Boxes, href: "/fournisseurs" },
  { Icon: FilePlus2, href: "/devis/nouveau" },
  { Icon: Send, href: "/devis" },
  { Icon: Scale },
  { Icon: Store, href: "/profil-public" },
  { Icon: ImagePlus, href: "/realisations" },
  { Icon: LayoutTemplate, href: "/modele-devis" },
  { Icon: UserRound, href: "/clients" },
  { Icon: MessageCircle, href: "/messages" },
  { Icon: LifeBuoy, href: "/compte" },
] as const;

export default function GuidePage() {
  const { t } = useI18n();
  const k = (n: number, part: "title" | "text" | "b") => t(`gd.f${n}.${part}` as keyof Messages);
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BookOpen size={24} aria-hidden className="text-primary" />
            {t("gd.title")}
          </h1>
          <p className="text-sm leading-relaxed text-muted">{t("gd.intro")}</p>
        </div>
        <button type="button" className="btn-primary" onClick={startGuide}>
          <PlayCircle size={18} aria-hidden />
          {t("gd.start")}
        </button>
      </header>

      <ol className="grid gap-4 xl:grid-cols-2">
        {FEATURES.map(({ Icon, ...f }, i) => (
          <li key={i} className="card space-y-3">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon size={20} aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold">
                  {i + 1}. {k(i + 1, "title")}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">{k(i + 1, "text")}</p>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{t("gd.keys")}</p>
              <ul className="list-disc space-y-1 pl-5 text-sm marker:text-primary">
                {k(i + 1, "b").split("|").map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
            {"href" in f && (
              <Link href={f.href} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                {t("gd.open")}
                <ArrowUpRight size={14} aria-hidden />
              </Link>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
