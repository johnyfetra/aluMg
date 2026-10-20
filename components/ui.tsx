import { CheckCircle2, Clock, FileEdit, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { FINISHES, FINISH_GROUPS, type FinishId } from "@/lib/model";
import type { T } from "@/lib/i18n";

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

// Le statut porte toujours une icône ET un texte : la couleur seule ne porte pas l'information.
const BADGE = {
  draft: { cls: "bg-surface-2 text-muted", Icon: FileEdit },
  sent: { cls: "bg-c1/15 text-c1", Icon: Clock },
  accepted: { cls: "bg-good/15 text-ok", Icon: CheckCircle2 },
  rejected: { cls: "bg-critical/15 text-danger", Icon: XCircle },
} as const;

export function StatusBadge({ status, label }: { status: keyof typeof BADGE; label: string }) {
  const { cls, Icon } = BADGE[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      <Icon size={13} aria-hidden />
      {label}
    </span>
  );
}

// Choix unique présenté en boutons (radios natifs : clavier et lecteurs d'écran fonctionnent d'office).
export function Choice<V extends string | number>({
  name,
  legend,
  value,
  options,
  onChange,
}: {
  name: string;
  legend: string;
  value: V;
  options: readonly { value: V; label: string }[];
  onChange: (v: V) => void;
}) {
  return (
    <fieldset className="min-w-0 space-y-1">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={String(o.value)} className="cursor-pointer">
            <input type="radio" name={name} className="peer sr-only" checked={o.value === value} onChange={() => onChange(o.value)} />
            <span className="flex min-h-11 items-center rounded-lg border border-line bg-surface px-3 text-sm font-medium peer-checked:border-primary peer-checked:bg-primary peer-checked:text-on-primary peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary hover:bg-surface-2 peer-checked:hover:bg-primary">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Choix de couleur du profilé : pastilles groupées (laqué, anodisé, faux bois).
export function FinishPicker({ name, legend, value, onChange, t }: { name: string; legend: string; value: FinishId; onChange: (v: FinishId) => void; t: T }) {
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      {FINISH_GROUPS.map(([group, label]) => (
        <div key={group}>
          <p className="mb-1 text-xs text-muted">{t(label)}</p>
          <div className="flex flex-wrap gap-2">
            {FINISHES.filter((f) => f.group === group).map((f) => (
              <label key={f.id} className="cursor-pointer">
                <input type="radio" name={name} className="peer sr-only" checked={f.id === value} onChange={() => onChange(f.id)} />
                <span className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-sm peer-checked:border-primary peer-checked:ring-2 peer-checked:ring-primary peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary hover:bg-surface-2">
                  <span aria-hidden className="size-5 rounded-full border border-black/20" style={{ background: f.hex }} />
                  {t(f.label)}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </fieldset>
  );
}
