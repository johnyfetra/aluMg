import { FinishSwatch, SwatchCheck } from "./Swatch";
import { CheckCheck, CheckCircle2, Clock, FileEdit, Hammer, Inbox, MessageSquareWarning, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { FINISHES, FINISH_GROUPS, type FinishId } from "@/lib/model";
import type { T } from "@/lib/i18n";

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink/90">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

// Le statut porte toujours une icône ET un texte : la couleur seule ne porte pas l'information.
const BADGE = {
  requested: { cls: "bg-warn/10 text-warn", Icon: Inbox },
  draft: { cls: "bg-surface-2 text-muted", Icon: FileEdit },
  sent: { cls: "bg-info/10 text-info", Icon: Clock },
  negotiation: { cls: "bg-warn/15 text-warn", Icon: MessageSquareWarning },
  accepted: { cls: "bg-good/15 text-ok", Icon: CheckCircle2 },
  in_progress: { cls: "bg-info/10 text-info", Icon: Hammer },
  completed: { cls: "bg-good/15 text-ok", Icon: CheckCheck },
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

// Barre d'avancement d'un chantier (0 à 100 %), annoncée aux lecteurs d'écran.
export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-2" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-c2 transition-[width] duration-500" style={{ width: `${value}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-semibold tabular-nums">{value} %</span>
    </div>
  );
}

// Choix unique présenté en boutons (radios natifs : clavier et lecteurs d'écran fonctionnent d'office).
export function Choice<V extends string | number>({
  name,
  legend,
  value,
  options,
  onChange,
  dense = false,
}: {
  name: string;
  legend: string;
  value: V;
  options: readonly { value: V; label: string }[];
  onChange: (v: V) => void;
  dense?: boolean;
}) {
  return (
    <fieldset className="min-w-0 space-y-1">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={String(o.value)} className="cursor-pointer">
            <input type="radio" name={name} className="peer sr-only" checked={o.value === value} onChange={() => onChange(o.value)} />
            <span className={`flex items-center rounded-lg border border-line bg-surface text-sm font-medium ${dense ? "min-h-9 px-2.5" : "min-h-11 px-3"} peer-checked:border-primary peer-checked:bg-primary peer-checked:text-on-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-primary hover:bg-surface-2 peer-checked:hover:bg-primary`}>
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Choix de couleur du profilé : pastilles groupées (laqué, anodisé, faux bois).
// Interrupteur (oui / non) accessible : un bouton role="switch".
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} title={label} disabled={disabled} onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50 ${checked ? "border-primary bg-primary" : "border-line bg-surface-2"}`}>
      <span aria-hidden className={`size-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

// hide : couleurs que les fournisseurs n'ont pas (la couleur déjà choisie reste visible).
export function FinishPicker({ name, legend, value, onChange, t, dense = false, hide = [], lead }: { name: string; legend: string; value: FinishId; onChange: (v: FinishId) => void; t: T; dense?: boolean; hide?: readonly FinishId[]; lead?: ReactNode }) {
  const shown = FINISHES.filter((f) => f.id === value || !hide.includes(f.id));
  const chosen = FINISHES.find((f) => f.id === value);
  if (dense)
    // Version compacte : une rangée de plaquettes par famille, le nom de la couleur choisie est affiché dans la légende.
    return (
      <fieldset className="min-w-0 space-y-2">
        <legend className="flex items-center gap-2 text-sm font-medium">
          {legend}
          {chosen && <span className="inline-flex items-center gap-1.5 font-normal text-muted">· <FinishSwatch id={chosen.id} size={16} />{t(chosen.label)}</span>}
        </legend>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
          {lead}
          {FINISH_GROUPS.map(([group, label], gi) => (
            <div key={group} role="group" aria-label={t(label)} className={`flex flex-wrap gap-1.5 ${gi ? "ml-2 border-l border-line pl-3" : ""}`}>
              {shown.filter((f) => f.group === group).map((f) => (
                <label key={f.id} className="cursor-pointer" title={t(f.label)}>
                  <input type="radio" name={name} className="peer sr-only" checked={f.id === value} onChange={() => onChange(f.id)} />
                  <span className="grid size-10 place-items-center rounded-lg border-2 border-transparent transition-colors hover:bg-surface-2 peer-checked:border-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
                    <SwatchCheck id={f.id} size={26} checked={f.id === value} />
                    <span className="sr-only">{t(f.label)}</span>
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>
      </fieldset>
    );
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="text-sm font-medium">{legend}</legend>
      {FINISH_GROUPS.map(([group, label]) => (
        <div key={group}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{t(label)}</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
            {shown.filter((f) => f.group === group).map((f) => (
              <label key={f.id} className="cursor-pointer">
                <input type="radio" name={name} className="peer sr-only" checked={f.id === value} onChange={() => onChange(f.id)} />
                <span className="flex min-h-[5.25rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-surface p-2 text-center text-xs font-medium leading-tight transition-colors hover:bg-surface-2 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:ring-1 peer-checked:ring-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
                  <SwatchCheck id={f.id} size={36} checked={f.id === value} />
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

// Étoiles de notation (remplissage partiel possible : 4,5 étoiles) ; la valeur est lue en toutes lettres par les lecteurs d'écran.
export function Stars({ value, size = 16, label }: { value: number; size?: number; label?: string }) {
  return (
    <span role="img" aria-label={label ?? `${value} / 5`} className="inline-flex gap-0.5 align-middle">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} aria-hidden className="relative inline-block" style={{ width: size, height: size }}>
            <svg viewBox="0 0 24 24" width={size} height={size} className="absolute inset-0 text-line" fill="currentColor">
              <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" />
            </svg>
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <svg viewBox="0 0 24 24" width={size} height={size} className="text-warn" fill="currentColor" style={{ color: "#f5a524" }}>
                <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" />
              </svg>
            </span>
          </span>
        );
      })}
    </span>
  );
}

// Pastille avec logo, ou initiales si pas de logo.
export function Avatar({ name, src, size = 44, round = false }: { name: string; src?: string; size?: number; round?: boolean }) {
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} className={`shrink-0 border border-line bg-white ${round ? "rounded-full object-cover" : "rounded-xl object-contain"}`} style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden className={`grid shrink-0 place-items-center bg-primary/15 font-bold text-primary ${round ? "rounded-full" : "rounded-xl"}`} style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials || "?"}
    </span>
  );
}

// Saisie d'une note de 1 à 5 étoiles (boutons : accessible au clavier et aux lecteurs d'écran).
export function StarInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" aria-pressed={value === n} aria-label={`${n} / 5`} onClick={() => onChange(n)} className="grid size-11 place-items-center rounded-lg hover:bg-surface-2">
          <svg viewBox="0 0 24 24" width={28} height={28} fill={n <= value ? "#f5a524" : "none"} stroke={n <= value ? "#f5a524" : "currentColor"} strokeWidth={1.6} className={n <= value ? "" : "text-muted"}>
            <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" />
          </svg>
        </button>
      ))}
    </div>
  );
}
