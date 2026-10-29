"use client";
import { Check, Star } from "lucide-react";
import useSWR from "swr";
import MultiSelect from "./MultiSelect";
import { Avatar } from "./ui";
import { fetcher } from "@/lib/client";
import type { T } from "@/lib/i18n";
import type { DirectoryEntry } from "@/lib/profiles";

export const MAX_RECIPIENTS = 5; // au-delà, la demande ressemble à du démarchage : on plafonne
export type Known = { slug: string; name: string; logo: string; city: string; phone: string };

// À qui envoyer la demande : un ou plusieurs professionnels (chacun répond par son propre devis, à comparer ensuite).
// Annuaire ouvert : liste à choix multiple ; sinon, les professionnels déjà connus du client (cartes à cocher) et le lien de demande d'un professionnel.
export default function RecipientsPicker({ value, onChange, directory, known, preset, t }: { value: string[]; onChange: (v: string[]) => void; directory: DirectoryEntry[]; known: Known[]; preset: string; t: T }) {
  // lien de demande d'un menuisier inconnu du client : on affiche son nom et son logo
  const { data: target } = useSWR<{ name: string; logo: string }>(preset && !directory.some((d) => d.slug === preset) && !known.some((k) => k.slug === preset) ? `/api/requests/target?slug=${encodeURIComponent(preset)}` : null, fetcher, { shouldRetryOnError: false });
  const toggle = (slug: string) => onChange(value.includes(slug) ? value.filter((s) => s !== slug) : value.length >= MAX_RECIPIENTS ? value : [...value, slug]);

  if (directory.length > 0)
    return (
      <div className="space-y-2">
        <MultiSelect
          id="rq-m"
          value={value}
          onChange={onChange}
          max={MAX_RECIPIENTS}
          placeholder={t("req.pickJoiners")}
          aria-label={t("req.joiner")}
          options={directory.map((m) => ({
            value: m.slug, label: m.name, description: m.city || undefined, leading: <Avatar name={m.name} src={m.logo} size={32} />,
            meta: m.reviews > 0 ? <span className="inline-flex items-center gap-1"><Star size={12} aria-hidden className="fill-[#f5a524] text-[#f5a524]" />{m.rating.toFixed(1)} ({m.reviews})</span> : undefined,
          }))}
        />
        <p className="text-xs text-muted">{t("req.multiHint")} ({MAX_RECIPIENTS} max)</p>
      </div>
    );

  const cards: Known[] = [...known, ...(preset && !known.some((k) => k.slug === preset) ? [{ slug: preset, name: target?.name ?? preset, logo: target?.logo ?? "", city: "", phone: "" }] : [])];
  if (!cards.length) return <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">{t("req.noKnown")}</p>;
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-2 text-sm font-medium">{t("req.knownTitle")}</legend>
      <div role="group" aria-label={t("req.knownTitle")} className="grid gap-2 sm:grid-cols-2">
        {cards.map((k) => {
          const on = value.includes(k.slug);
          const blocked = !on && value.length >= MAX_RECIPIENTS;
          return (
            <button key={k.slug} type="button" role="checkbox" aria-checked={on} disabled={blocked} onClick={() => toggle(k.slug)} className={`flex min-h-14 items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-45 ${on ? "border-primary bg-primary/10" : "border-line hover:bg-surface-2"}`}>
              <Avatar name={k.name} src={k.logo} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{k.name}</span>
                {(k.city || k.phone) && <span className="block truncate text-xs text-muted">{[k.city, k.phone].filter(Boolean).join(" · ")}</span>}
              </span>
              <span aria-hidden className={`grid size-5 shrink-0 place-items-center rounded-md border ${on ? "border-primary bg-primary text-on-primary" : "border-line"}`}>{on && <Check size={13} strokeWidth={3} />}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">{t("req.multiHint")} ({MAX_RECIPIENTS} max)</p>
    </fieldset>
  );
}
