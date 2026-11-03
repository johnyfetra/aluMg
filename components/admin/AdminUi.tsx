"use client";
import { Check, ChevronLeft, ChevronRight, Copy, KeyRound } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/lib/client";
import { errorText } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import type { Messages } from "@/lib/messages/fr";

type T = (k: keyof Messages) => string;

// Refus propres à l'administration (compte protégé, soi-même, confirmation), sinon le message selon la cause (réseau, session, débit…).
export function adminError(e: unknown, t: T) {
  const code = e instanceof ApiError ? e.code : "";
  if (code === "protected") return t("admin.err.protected");
  if (code === "self") return t("admin.err.self");
  if (code === "confirm_mismatch") return t("admin.err.confirm");
  if (code === "email_taken") return t("auth.taken");
  if (code === "phone_taken") return t("auth.phoneTaken");
  return errorText(e, t);
}

// Statut d'un compte : suspendu, sinon vérifié ou non (en texte, jamais par la couleur seule).
export function AccountStatus({ suspended, verified }: { suspended: boolean; verified: boolean }) {
  const { t } = useI18n();
  const [cls, label] = suspended ? ["bg-danger/12 text-danger", t("admin.suspended")] : verified ? ["bg-ok/15 text-ok", t("admin.verified")] : ["bg-surface-2 text-muted", t("admin.unverified")];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}

export function Pager({ page, pageSize, total, noun, onPage }: { page: number; pageSize: number; total: number; noun: string; onPage: (p: number) => void }) {
  const { t } = useI18n();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav aria-label={t("admin.page")} className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted"><strong className="text-ink">{total}</strong> {noun}</p>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-secondary !min-h-10 !px-3" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t("admin.prev")}><ChevronLeft size={16} aria-hidden /></button>
        <span aria-live="polite">{t("admin.page")} {page} {t("admin.of")} {pages}</span>
        <button type="button" className="btn-secondary !min-h-10 !px-3" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label={t("admin.next")}><ChevronRight size={16} aria-hidden /></button>
      </div>
    </nav>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  const { t } = useI18n();
  return (
    <div role="status" aria-busy="true" className="space-y-2">
      <span className="sr-only">{t("common.loading")}</span>
      {Array.from({ length: rows }, (_, i) => <div key={i} aria-hidden className="skeleton h-16" />)}
    </div>
  );
}

// Mot de passe temporaire : montré une seule fois (il n'est gardé que dans l'état de la page), à copier puis fermer.
export function TempPassword({ title, password, onDone }: { title: string; password: string; onDone: () => void }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      /* presse-papiers indisponible : le mot de passe reste affiché */
    }
  };
  return (
    <section role="status" className="card space-y-3 border-primary/40">
      <h2 className="flex items-center gap-2 font-semibold"><KeyRound size={18} aria-hidden className="text-primary" />{title}</h2>
      <p className="text-sm text-muted">{t("admin.tempHint")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="sr-only">{t("admin.tempPassword")}</span>
        <code className="rounded-lg bg-surface-2 px-3 py-2 font-mono text-base tracking-wide select-all">{password}</code>
        <button type="button" className="btn-secondary !min-h-10" onClick={copy}>{copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}{copied ? t("admin.copied") : t("admin.copy")}</button>
      </div>
      <button type="button" className="btn-primary" onClick={onDone}>{t("admin.noted")}</button>
    </section>
  );
}
