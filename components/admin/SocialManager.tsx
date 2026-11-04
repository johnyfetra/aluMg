"use client";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { mutate } from "swr";
import { adminError, ListSkeleton } from "@/components/admin/AdminUi";
import { useConfirm } from "@/components/ConfirmDialog";
import { EmptyState, ErrorState } from "@/components/Feedback";
import Select from "@/components/Select";
import SocialIcon from "@/components/SocialIcon";
import { useToast } from "@/components/Toast";
import { Field, Switch } from "@/components/ui";
import { request, useAdminSocial } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { SOCIAL_NETWORKS, type SocialNetwork } from "@/lib/model";
import { socialUrlOk } from "@/lib/social";

type Draft = { id: string | null; network: SocialNetwork; label: string; url: string };
const EMPTY: Draft = { id: null, network: "facebook", label: "", url: "" };

// Gestion des réseaux sociaux de la plateforme : ajouter, modifier, masquer, ordonner, retirer. Ils s'affichent dans le pied de page du site.
export default function SocialManager() {
  const { t } = useI18n();
  const ask = useConfirm();
  const toast = useToast();
  const { data, error, isLoading, mutate: retry } = useAdminSocial();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const valid = draft.label.trim().length > 0 && socialUrlOk(draft.network, draft.url.trim());
  const refresh = () => Promise.all([mutate("/api/admin/social"), mutate("/api/public/social"), mutate((k) => typeof k === "string" && k.startsWith("/api/admin/audit"))]);
  const run = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
      if (done) toast.success(done);
      return true;
    } catch (e) {
      toast.error(adminError(e, t));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    const body = { network: draft.network, label: draft.label.trim(), url: draft.url.trim() };
    const ok = await run(() => (draft.id ? request("PATCH", `/api/admin/social/${draft.id}`, body) : request("POST", "/api/admin/social", { ...body, visible: true })), t("admin.socialSaved"));
    if (ok) {
      setDraft(EMPTY);
      setTouched(false);
    }
  };
  const remove = async (id: string) => {
    if (!(await ask({ message: t("admin.socialDeleteConfirm"), tone: "danger", confirmLabel: t("admin.socialDelete") }))) return;
    await run(() => request("DELETE", `/api/admin/social/${id}`), t("admin.socialRemoved"));
    if (draft.id === id) setDraft(EMPTY);
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.social")}</h1>
        <p className="text-sm text-muted">{t("admin.socialSub")}</p>
      </div>

      <form onSubmit={submit} noValidate className="card grid gap-3 md:grid-cols-[12rem_1fr_1.6fr_auto] md:items-start">
        <Field htmlFor="so-net" label={t("admin.socialNetwork")}>
          <Select id="so-net" value={draft.network} onChange={(v) => setDraft({ ...draft, network: v as SocialNetwork })} options={SOCIAL_NETWORKS.map((n) => ({ value: n, label: t(`social.${n}`), leading: <SocialIcon network={n} size={16} /> }))} />
        </Field>
        <Field htmlFor="so-label" label={t("admin.socialLabel")}>
          <input id="so-label" className="input" maxLength={60} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} aria-invalid={touched && !draft.label.trim()} />
        </Field>
        <Field htmlFor="so-url" label={t("admin.socialUrl")} error={touched && !socialUrlOk(draft.network, draft.url.trim()) ? t("admin.socialInvalid") : undefined}>
          <input id="so-url" className="input" type="url" inputMode="url" maxLength={300} placeholder="https://" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} aria-invalid={touched && !socialUrlOk(draft.network, draft.url.trim())} />
        </Field>
        <div className="flex gap-2 md:mt-7">
          <button type="submit" className="btn-primary" disabled={busy}>
            {draft.id ? t("admin.socialSave") : <><Plus size={16} aria-hidden />{t("admin.socialAdd")}</>}
          </button>
          {draft.id && <button type="button" className="btn-secondary" onClick={() => (setDraft(EMPTY), setTouched(false))}>{t("admin.socialCancel")}</button>}
        </div>
      </form>

      {error ? <ErrorState retry={() => retry()} /> : isLoading || !data ? <ListSkeleton rows={2} /> : data.length === 0 ? <EmptyState message={t("admin.socialEmpty")} /> : (
        <ul className="card divide-y divide-line !py-1">
          {data.map((s, i) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-primary"><SocialIcon network={s.network} size={20} /></span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{s.label} <span className="text-sm font-normal text-muted">· {t(`social.${s.network}`)}</span></p>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm text-primary hover:underline">{s.url}</a>
              </div>
              <Switch checked={s.visible} disabled={busy} label={t("admin.socialVisible")} onChange={(visible) => run(() => request("PATCH", `/api/admin/social/${s.id}`, { visible }))} />
              <div className="flex gap-1">
                <button type="button" className="btn-secondary !min-h-9 !px-2.5" disabled={busy || i === 0} aria-label={t("admin.socialUp")} data-tooltip={t("admin.socialUp")} onClick={() => run(() => request("PATCH", `/api/admin/social/${s.id}`, { move: "up" }))}><ArrowUp size={15} aria-hidden /></button>
                <button type="button" className="btn-secondary !min-h-9 !px-2.5" disabled={busy || i === data.length - 1} aria-label={t("admin.socialDown")} data-tooltip={t("admin.socialDown")} onClick={() => run(() => request("PATCH", `/api/admin/social/${s.id}`, { move: "down" }))}><ArrowDown size={15} aria-hidden /></button>
                <button type="button" className="btn-secondary !min-h-9 !px-2.5" aria-label={t("admin.socialEdit")} data-tooltip={t("admin.socialEdit")} onClick={() => (setDraft({ id: s.id, network: s.network, label: s.label, url: s.url }), setTouched(false))}><Pencil size={15} aria-hidden /></button>
                <button type="button" className="btn-danger !min-h-9 !px-2.5" disabled={busy} aria-label={t("admin.socialDelete")} data-tooltip={t("admin.socialDelete")} onClick={() => remove(s.id)}><Trash2 size={15} aria-hidden /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
