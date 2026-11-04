"use client";
import { BadgeCheck, Images, MapPin, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Lightbox from "./Lightbox";
import { lineTitle } from "@/lib/describe";
import { usePublicWorks } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { type Line, type WorkType, workType } from "@/lib/model";
import { onImgError } from "@/lib/fallback";

// Spécialité de réalisation qui correspond à chaque type d'ouvrage (les réalisations sont classées par spécialité).
const SPECIALTY: Record<WorkType, string> = { fenetre: "fenetres", naco: "fenetres", porte: "portes", roulant: "volets", rideau: "volets", "garde-corps": "garde-corps", cloison: "cloisons" };
const plain = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
// Mots qui précisent l'ouvrage dans le titre ou la description d'une réalisation : celles qui les citent passent en premier.
const keywords = (l: Pick<Line, "category" | "opening" | "shutter">): RegExp | null => {
  const w = workType(l);
  if (w === "naco") return /naco|jalousie/;
  if (w === "rideau") return /rideau|metallique/;
  if (w === "roulant") return /roulant/;
  if (l.category === "fenetre" || l.category === "porte") return l.opening === "coulissant" ? /coulissan/ : l.opening === "ouvrant" ? /ouvrant|battant/ : l.opening === "fixe" ? /\bfixe|vitrine|baie/ : l.opening === "soufflet" ? /soufflet|projetan/ : null;
  return null;
};

// Réalisations publiées par les menuisiers pour ce type d'ouvrage : une fenêtre coulissante montre d'abord des fenêtres coulissantes. Visible du menuisier comme du client.
// Masqué pour l'instant (demande du produit) : à passer à true quand les menuisiers auront publié assez de réalisations par type d'ouvrage.
const SHOW_WORKS = false;

export default function WorksButton({ line, className = "btn-secondary w-full" }: { line: Line; className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (!SHOW_WORKS) return null;
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <Images size={16} aria-hidden />
        {t("works.see")}
      </button>
      {open && <WorksDialog line={line} onClose={() => setOpen(false)} />}
    </>
  );
}

function WorksDialog({ line, onClose }: { line: Line; onClose: () => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const [zoom, setZoom] = useState<{ id: string; photos: number; title: string; description: string; i: number } | null>(null);
  const { data, error, isLoading } = usePublicWorks({ category: SPECIALTY[workType(line)] });
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  const re = keywords(line);
  const works = [...(data ?? [])].sort((a, b) => Number(re?.test(plain(`${b.title} ${b.description}`)) ?? 0) - Number(re?.test(plain(`${a.title} ${a.description}`)) ?? 0));
  const title = lineTitle(line, t);
  return (
    <dialog ref={ref} aria-labelledby="works-title" onClose={() => !ref.current?.open && onClose()} onClick={(e) => e.target === ref.current && onClose()} className="m-auto max-h-[90vh] w-[min(96vw,60rem)] overflow-hidden rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/60">
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 id="works-title" className="text-lg font-semibold">{t("works.title")}</h2>
          <p className="truncate text-sm text-muted">{title}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t("viewer.close")} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-surface-2">
          <X size={20} aria-hidden />
        </button>
      </div>
      <div className="max-h-[calc(90vh-5rem)] overflow-y-auto p-5">
        {error ? <p role="alert" className="text-sm text-danger">{t("common.error")}</p> : isLoading ? <p role="status" className="text-sm text-muted">{t("common.loading")}</p> : !works.length ? <p className="rounded-xl bg-surface-2 p-4 text-sm text-muted">{t("works.none")}</p> : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {works.map((w) => (
              <li key={w.id} className="overflow-hidden rounded-xl border border-line">
                <button type="button" onClick={() => setZoom({ id: w.id, photos: w.photos, title: w.title, description: w.description, i: 0 })} className="group block w-full text-left">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {w.thumb ? <img src={w.thumb} onError={onImgError} alt={w.title} loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" /> : <div className="aspect-[4/3] bg-surface-2" />}
                  <div className="space-y-1 p-3">
                    <p className="font-semibold leading-snug">{w.title}</p>
                    <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
                      {w.city && <span className="inline-flex items-center gap-1"><MapPin size={12} aria-hidden />{w.city}</span>}
                      {w.photos > 1 && <span>{w.photos} {t("works.photos")}</span>}
                    </p>
                  </div>
                </button>
                <p className="flex items-center gap-1 border-t border-line px-3 py-2 text-xs">
                  {t("gal.by")}{" "}
                  <Link href={`/menuisiers/${w.menuisier.slug}#h-port`} className="font-semibold text-primary hover:underline">{w.menuisier.name}</Link>
                  {w.menuisier.verified && <BadgeCheck size={14} aria-label={t("dir.verified")} className="text-primary" />}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
      {zoom && <Lightbox images={Array.from({ length: Math.max(1, zoom.photos) }, (_, i) => `/api/public/works/${zoom.id}/img?n=${i}`)} index={zoom.i} onIndex={(i) => setZoom({ ...zoom, i })} onClose={() => setZoom(null)} label={zoom.title} caption={zoom.description} />}
    </dialog>
  );
}
