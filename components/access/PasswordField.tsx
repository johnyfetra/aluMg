"use client";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { FieldError } from "../ui";
import { useI18n } from "@/lib/i18n";
import type { Messages } from "@/lib/messages/fr";

// Force indicative d'un mot de passe (0 à 4) : longueur et variété des caractères. Le serveur reste seul juge (voir lib/password.ts).
export const passwordScore = (p: string) => {
  const points = [p.length >= 8, p.length >= 12, /[a-z]/.test(p) && /[A-Z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
  return p ? Math.min(4, Math.max(1, points - (p.length < 8 ? 1 : 0))) : 0;
};
const LABELS = ["", "auth.pw.weak", "auth.pw.fair", "auth.pw.good", "auth.pw.strong"] as const;
const COLORS = ["", "bg-danger", "bg-warn", "bg-ok", "bg-ok"] as const;

export default function PasswordField({ id, name, label, signup, error, onInput }: { id: string; name: string; label: string; signup: boolean; error?: string; onInput?: () => void }) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);
  const [value, setValue] = useState("");
  const score = signup ? passwordScore(value) : 0;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[13px] font-medium text-ink/90">{label}</label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={shown ? "text" : "password"}
          required
          maxLength={200}
          autoComplete={signup ? "new-password" : "current-password"}
          className="input !pr-10"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          value={value}
          onChange={(e) => { setValue(e.target.value); onInput?.(); }}
        />
        <button type="button" onClick={() => setShown((s) => !s)} aria-label={t(shown ? "auth.hidePassword" : "auth.showPassword")} aria-pressed={shown} className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink">
          {shown ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        </button>
      </div>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
      {signup && (
        <div aria-live="polite" className="space-y-1">
          <div className="flex gap-1" aria-hidden>
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className={`h-1 flex-1 rounded-full ${n <= score ? COLORS[score] : "bg-surface-2"}`} />
            ))}
          </div>
          <p className="flex justify-between text-xs text-muted">
            <span>{error ? "" : t("auth.pw.tip")}</span>
            {score > 0 && <span className="font-medium text-ink/80">{t(LABELS[score] as keyof Messages)}</span>}
          </p>
        </div>
      )}
    </div>
  );
}
